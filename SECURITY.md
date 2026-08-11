# Security Policy

## Supported versions

We support the latest published `0.x` release of `@vanduo-oss/vdl-ai-chat` on npm.

## Reporting a vulnerability

Please report security issues privately via GitHub Security Advisories for [vanduo-oss/vdl-ai-chat](https://github.com/vanduo-oss/vdl-ai-chat), or email the maintainers listed on the GitHub org.

Do **not** open a public issue for exploitable vulnerabilities.

Include:

- Package version
- Affected API surface (`AiChat`, guardrails, markdown, etc.)
- Reproduction steps and impact

## Scope notes

- This library runs models **on-device** in the browser. Host apps are responsible for CSP, WASM hosting (`liteRtWasmPath`), and not shipping secrets in client bundles.
- Deterministic LLM/tool guardrails reduce jailbreak and tool-exfiltration risk but are not a substitute for product threat modeling.
- Model weights are fetched from third-party hosts (e.g. Hugging Face). Treat network and Cache Storage contents accordingly.
