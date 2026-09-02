# Keryon Integration

## Approved Model

```text
               @filesetgo/core
                     │
           ┌─────────┴─────────┐
           ▼                   ▼
      FileSetGo             Keryon
      Web App               Admin
```

FileSetGo and Keryon consume the same browser-processing capability. Keryon is an integration and early real-world validation environment; it is not the parent product.

## Shared Package Boundary

`@filesetgo/core` provides generic browser-side file capabilities. It must not know about:

- `Church`;
- `ChurchMembership`;
- tenants;
- Keryon storage;
- authorization; or
- Keryon pricing.

It also does not own Keryon routes, UI policy, promotion decisions, or persistence.

## Keryon Responsibility

Keryon:

1. collects an authorized source selection and destination requirements;
2. invokes `@filesetgo/core` in the browser;
3. presents the generated result for review;
4. uploads only the approved generated asset to Keryon's storage or CDN; and
5. applies Keryon's authorization, tenancy, naming, storage, and retention rules.

The original source does not need to pass through Keryon servers merely to perform supported processing.

## Cross-promotion

Cross-promotion is handled by the host applications, not `@filesetgo/core`.

- FileSetGo may show contextual Keryon promotion under FileSetGo product policy.
- Keryon may show contextual FileSetGo attribution or promotion under Keryon product policy.
- Referral measurement belongs to host-level analytics and must follow FileSetGo privacy engineering rules.

## Version Governance

Each host pins and tests a compatible `@filesetgo/core` version. Core changes preserve typed public contracts or publish a deliberate version change. Keryon integration ships in FSG-008 and must not shape FSG-001 package internals through Keryon-specific abstractions.
