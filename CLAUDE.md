# AI AGENT DIRECTIVES - RIDE-RTREE PROJECT

## MANDATORY AUTHOR IDENTIFICATION & GIT PROTOCOL:
When any AI assistant generates or modifies code:
1. **AUTHOR PRESERVATION IS MANDATORY:** Every commit MUST use the `--author="<Name> <<email>>"` flag corresponding to the assigned developer.
   - NEVER attribute commits of other members to "Truong Vu".
   - Each member's work must reflect their own git author identity.

### Developer Identity Table:
- **Tưởng:** `--author="Tuong <tuong@student.edu.vn>"` | Tasks: `[RT-05]`, `[RT-06]`, `[RT-07]`
- **Vương:** `--author="Vuong <vuong@student.edu.vn>"` | Tasks: `[RT-08]`, `[RT-09]`, `[RT-10]`
- **Đẹp:** `--author="Dep <dep@student.edu.vn>"` | Tasks: `[RT-11]`, `[RT-12]`, `[RT-13]`
- **Dương:** `--author="Duong <duong@student.edu.vn>"` | Tasks: `[RT-14]`, `[RT-15]`, `[RT-16]`
- **Trường Vũ:** `--author="Truong Vu <truongvu@student.edu.vn>"` | Tasks: `[RT-01]`, `[RT-02]`, `[RT-03]`, `[RT-04]`

## EXECUTION RULES:
1. **If shell execution is available:** Automatically execute `git add <files>` and `git commit --author="..." -m "..."`.
2. **If shell execution is unavailable:** Append the exact CMD/Bash command with `--author` at the end of your response for the user to copy and run.

## STRICT CONSTRAINTS:
- Language: C++17 pure implementation (Guttman 1984).
- NO external R-tree libraries, NO SQL/NoSQL databases, NO WebSockets, NO payment gateways.
