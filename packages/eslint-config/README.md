# @ductura/eslint-config

Pravila koda Ductura repozitorija (ESLint flat config). Izvor su pravila S-0.7 iz `ductura/server` (`docs/CODE_STYLE.md`).

```ts
// eslint.config.ts
import { ductura } from "@ductura/eslint-config";

export default ductura({ boundaries: true });
```

Opcije:

- `boundaries` (zadano `false`): granice modularnog monolita. Uvoz iz druge mape ide samo kroz njezin `index.ts`.
- `propertyNames`: točna imena svojstava koja određuje vanjski protokol, npr. `client_id`.
- `methodNames`: točna imena metoda objektnog literala koja određuje vanjski alat.

Inline `eslint-disable` je isključen. Implicitni `any` hvata `@ductura/tsconfig`, ne ovaj paket.
