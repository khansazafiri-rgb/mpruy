# Complete current Anatomy source

Repository: https://github.com/khansazafiri-rgb/mpruy
Branch: handoff/anatomy-visual-learning
Commit: 982dae673e2f761ae9e8a08235df6122a040317e
Project: standalone Anatomy at repository root, not apps/web.

Use the complete source from that branch. It contains the reviewed latest UI/engine, unchanged GLBs, all mesh thumbnails, current Library and Annotator protocols, and existing ready/error/share host integration. The previous anatomy-host.patch is historical and is not needed.

See integration/CLAUDE-ANATOMY-HANDOFF.md for separate clone locations, validation and preview commands. Build the Anatomy viewer with base /anatomy/viewer/ and keep the main product routes on the main frontend. This handoff does not deploy, modify Caddy or restart any service.
