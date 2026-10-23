# test/fixtures — 库回归语料（canonical 归属地）

`@njbestway/acad-ts-converter` 的**自动化回归语料**由库自己拥有——单测直接从这里读，
不去反向依赖 example 应用。（历史上 HANDOFF §8 P0 曾建议放 `examples/.../fixtures/`；
2026-10-23 起迁入此处，作为唯一真相源。）

| 文件 | 大小 | md5 | 已知基线（entities / unmapped） | 哨兵意义 |
|---|---|---|---|---|
| `baseline-sample.dwg` | 80 KB | `5f83524247550ffb1f591be0abbdba6d` | 160 / 6 | ★ 含 19 个 `AcDbHatch` → 守 workingDatabase 自绑定回归（HANDOFF §5.1） |
| `map-of-uae.dwg` | 195 KB | `026c64928665026c43378acabc2749b1` | 129 / 0 | 映射广度全包住，`unmapped=0` → 不回归的正向哨兵 |

基线在 acad-ts **3.3.0** 与 **3.6.0** 上实测计数一致（升级见 HANDOFF §4）。跑单测：

```bash
pnpm --filter @njbestway/acad-ts-converter test   # = build(lib) 后 vitest run
```

大图（`gaoshan`/`talahao` 等）故意不入库，见根 `HANDOFF.md` §6。
