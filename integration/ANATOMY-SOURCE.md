# Separate Anatomy source

This patch contains the reviewed host integration for the separately managed Anatomy source.
Base: b89d529a6b4b069431dde19aa75286aa656d2b8b
Integrated commit: da3588ac175ecea4846c73213e307815bd074dc2
Apply only after checking the Anatomy checkout matches the reviewed source.

Build Anatomy with base /anatomy/viewer/. Set ANATOMY_DIST to its dist directory when running scripts/stage-anatomy.mjs or the preview server. The default ../anatomy/dist matches the reviewed two-frontend workspace.

No GLB or engine modifications are included. This file is not a production deployment instruction.
