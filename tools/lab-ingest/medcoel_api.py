"""Small MEDCOEL admin API client shared by the Lab ingest tools.

Everything goes through the validated HTTP API. Nothing here ever opens SQLite.

Environment:
  MEDCOEL_ADMIN_IDENTITY, MEDCOEL_ADMIN_PASSWORD
  MEDCOEL_API_BASE   (default: https://medcoel.com)
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


class ApiError(RuntimeError):
    def __init__(self, code: int, method: str, path: str, raw: str):
        super().__init__(f"HTTP {code} {method} {path}: {raw}")
        self.code = code
        self.raw = raw


class MedcoelAPI:
    def __init__(self, base: str, identity: str, password: str):
        self.base = base.rstrip("/")
        self.identity = identity
        self.password = password
        self.token = ""

    @classmethod
    def from_env(cls) -> "MedcoelAPI":
        identity = os.getenv("MEDCOEL_ADMIN_IDENTITY", "")
        password = os.getenv("MEDCOEL_ADMIN_PASSWORD", "")
        if not identity or not password:
            raise RuntimeError("Perlu MEDCOEL_ADMIN_IDENTITY dan MEDCOEL_ADMIN_PASSWORD (akun admin MEDCOEL).")
        api = cls(os.getenv("MEDCOEL_API_BASE", "https://medcoel.com"), identity, password)
        api.login()
        return api

    def request(self, method: str, path: str, body: dict[str, Any] | None = None) -> Any:
        headers = {"Accept": "application/json"}
        payload = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            payload = json.dumps(body).encode("utf-8")
        if self.token:
            headers["Authorization"] = self.token
        req = urllib.request.Request(self.base + path, data=payload, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            raise ApiError(exc.code, method, path, exc.read().decode("utf-8", errors="replace")) from exc

    _request = request  # backward-compatible name

    def login(self) -> None:
        data = self.request("POST", "/api/collections/users/auth-with-password", {"identity": self.identity, "password": self.password})
        self.token = data.get("token", "")
        if not self.token:
            raise RuntimeError("Login admin berhasil tanpa token? Periksa respons PocketBase.")

    def require_study_guides(self) -> None:
        """Fail before writes if the running backend would silently discard authored guides."""
        try:
            capabilities = self.request("GET", "/api/medcoel/admin/lab-capabilities")
        except ApiError as exc:
            if exc.code != 404:
                raise
            raise RuntimeError("Running PocketBase does not support studyGuide yet. Load the updated backend hooks before importing; nothing changed.") from exc
        if capabilities.get("studyGuide") != 1:
            raise RuntimeError("Unsupported studyGuide schema on running backend; nothing changed.")

    def list_all(self, kind: str) -> list[dict[str, Any]]:
        page = 1
        out: list[dict[str, Any]] = []
        while True:
            data = self.request("GET", f"/api/medcoel/admin/lab/{kind}?page={page}")
            out.extend(data.get("items", []))
            if not data.get("hasMore"):
                return out
            page += 1

    def create(self, kind: str, body: dict[str, Any]) -> dict[str, Any]:
        return self.request("POST", f"/api/medcoel/admin/lab/{kind}", body)

    def update(self, kind: str, record_id: str, body: dict[str, Any]) -> dict[str, Any]:
        """PUT with the record's current revision; the server rejects a stale revision instead of overwriting."""
        return self.request("PUT", f"/api/medcoel/admin/lab/{kind}/{record_id}", body)

    def pack(self, slug: str) -> dict[str, Any] | None:
        try:
            return self.request("GET", f"/api/medcoel/admin/lab-packs/{slug}")
        except ApiError as exc:
            if exc.code == 404:
                return None
            raise

    def create_pack(self, body: dict[str, Any]) -> dict[str, Any]:
        return self.request("POST", "/api/medcoel/admin/lab-packs", body)


PNEUMONIA_OBJECT_SLUGS = ("pneumoniamnist-pengenalan", "pneumoniamnist-latihan-klasifikasi")


def resolve_content_pack(api: MedcoelAPI, slug: str, *, records=None,
                         object_slugs=PNEUMONIA_OBJECT_SLUGS, dataset_name="PneumoniaMNIST") -> dict[str, Any] | None:
    """Resolve an existing pack without changing its slug, content or membership.

    An older installation may have a different pack slug. Only follow the single
    consistent pack ID attached to the known lessons and their linked content;
    require the adapter's dataset asset provenance before accepting this fallback.
    Ambiguous or dangling references must never create a replacement pack.
    """
    canonical = api.pack(slug)
    if records is None:
        if canonical is not None:
            return canonical
        records = {kind: {r["slug"]: r for r in api.list_all(kind)}
                   for kind in ("objects", "questions", "assets")}
    objects = [r for r in records["objects"].values() if r["slug"] in object_slugs]
    object_ids = {r["id"] for r in objects}
    questions = [r for r in records["questions"].values()
                 if object_ids.intersection(r.get("objects", []))]
    asset_ids = {r.get("asset") for r in questions}
    asset_ids.update(a for r in objects for a in r.get("assets", []))
    assets = [r for r in records["assets"].values() if r["id"] in asset_ids]
    pack_ids = {r["pack"] for r in objects + questions + assets if r.get("pack")}
    if canonical is not None:
        pack_ids.add(canonical["id"])
    if len(pack_ids) > 1:
        raise RuntimeError(f"Conflicting pack references for {dataset_name}: " +
                           ", ".join(sorted(pack_ids)) + ". Review membership; nothing changed.")
    if not pack_ids:
        return canonical
    linked_id = next(iter(pack_ids))
    if canonical is not None:
        return canonical
    if not any(a.get("data", {}).get("dataset", {}).get("name") == dataset_name or
               a.get("data", {}).get("license", {}).get("dataset") == dataset_name
               for a in assets):
        raise RuntimeError(f"Linked pack found but {dataset_name} asset provenance is missing. Nothing changed.")
    linked = api.pack(linked_id)
    if linked is None or linked.get("id") != linked_id:
        raise RuntimeError(f"Existing content references pack {linked_id}, but it cannot be resolved by ID. "
                           "Review the pack/API before retrying; no replacement pack was created.")
    return linked
