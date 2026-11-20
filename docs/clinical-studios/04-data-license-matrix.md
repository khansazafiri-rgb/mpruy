# 04 — Data and licence matrix

| Asset / dataset | Where | Status | Usable by studios? |
|---|---|---|---|
| Atlas models (6 cleared bundles) | `apps/anatomy/public/models` | Product `blocked`; owner override until 2027-02-08; `rightsVerified: false` | Only through the Atlas product and its gate; no copying into studio bundles |
| Nervous system, kidney, renal pelvis, ossicles | — | **Withheld (quarantine)** | No. Never substituted. `brain-anatomy` = blocked |
| Atlas catalogue, definitions, Latin lexicon (1,476), IT synonyms (204) | `apps/anatomy/public/data` | Same as Atlas (CC BY-NC-SA-derived) | Read through the Atlas data path only |
| Indonesian anatomical terms | `library-reference.json` synonyms | **25 entries only** | Typed quiz in Indonesian needs a reviewed terminology set (new, Loop 2+) |
| 4D Lab synthetic phantom | `apps/4d-lab/public/data/phantom` | Original MEDCOEL, `synthetic: true` | Yes, labelled synthetic; product licence gate still applies |
| 4D Lab atlas-derived CT/labels | `apps/4d-lab/public/data/atlas` | CC BY-SA adaptation, inferred provenance | Through the 4D Lab only |
| 4D Lab scenarios (pericardial, effusion, ascites, retention, gastroparesis, hfref) | `src/sim/pathology.js` | Educational approximation; **no clinical sign-off recorded** | Studio `review.clinical = pending` |
| ECG schematic module | `/lab/ekg` | Server gate closed to students pending clinical review | Not until the gate opens |
| BodyParts3D Current Archive 4.0 | Official DBCLS source; local candidates stay private | Current official archive declares CC BY 4.0; this does not relicense older mixed BodyParts3D/Z-Anatomy derivatives or NC application code | Source candidate only; exact bytes/provenance/medical/privacy clearance still required |
| CTACardio, EchoNet, IT'IS ViP, TotalSegmentator weights | local only | **Restricted** | Never committed or served |
| Real CT / MRI / X-ray series | — | **None in repository** | Missing; must be sourced with documented rights + review before any CT/MRI/X-ray studio leaves `planned` |
| Foundation fixture content | to be created | Original neutral test shapes/text | Yes (internal only) |

Delivery: everything under Caddy `file_server` is **public**. No protected dataset may be placed under `/studio-assets/`;
protected delivery needs an authorised endpoint (out of Loop 1 scope).


B1 adds an empty source/asset index and offline checks, not dataset acquisition or new rights approvals. See `07-resource-reconciliation-pr-b.md`.
