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
