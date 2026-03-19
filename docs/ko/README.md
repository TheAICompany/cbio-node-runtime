# cbio Node Runtime

cbio identity 및 credential vault용 Node.js 런타임. 라이브러리만 제공, CLI/TUI 없음.

메인 export에서 `CbioIdentity`, `CbioAgent`를 import하여 사용.

## 설치

```bash
npm install @the-ai-company/cbio-node-runtime
```

## 사용법

```ts
import { CbioIdentity, generateIdentityKeys } from '@the-ai-company/cbio-node-runtime';

const keys = generateIdentityKeys();
const identity = await CbioIdentity.load({ privateKey: keys.privateKey });
```

## 빌드

```bash
npm run build
npm run test
```
