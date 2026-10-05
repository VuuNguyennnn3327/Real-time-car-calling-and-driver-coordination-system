# GitHub Copilot Instructions for RIDE-RTREE

- Always respect the member assignments defined in `PROJECT_MASTER_BRIEF.md`.
- Whenever completing code changes, instruct the user to run `git commit` or execute it directly, tagging the corresponding Jira task code (`[RT-01]` to `[RT-16]`) and member name.
- Coordinate conventions: C++ uses `x = Longitude`, `y = Latitude`. Leaflet uses `[lat, lng]`.
- Keep implementations pure C++17 without external R-tree libraries.
