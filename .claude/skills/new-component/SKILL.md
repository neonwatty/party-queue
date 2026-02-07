---
name: new-component
description: Scaffold a new React component following project conventions. Usage: /new-component <ComponentName> [party|ui]
disable-model-invocation: true
---

Create a new React component: $ARGUMENTS

## Steps

1. Parse `$ARGUMENTS` for the component name and optional directory (`party` or `ui`). Default to `ui` if not specified.
2. Read existing components in the target directory (`components/party/` or `components/ui/`) for naming and style patterns.
3. Create `components/<dir>/<ComponentName>.tsx` with this structure:

```tsx
'use client'

// imports as needed

interface <ComponentName>Props {
  // props
}

export function <ComponentName>({ }: <ComponentName>Props) {
  return (
    <div>
      {/* component content */}
    </div>
  )
}
```

4. Add the export to the barrel file `components/<dir>/index.ts`:
   ```ts
   export { <ComponentName> } from './<ComponentName>'
   ```
5. Fill in the component implementation based on the description in `$ARGUMENTS`.

## Conventions

- Always use `'use client'` directive (this is a client-rendered app)
- Use named exports, not default exports
- Use Tailwind CSS v4 utility classes for styling (no CSS modules)
- Use `@/` path alias for imports (e.g., `@/hooks/useParty`)
- Props interface named `<ComponentName>Props`
- Icons from `@/components/icons` (check `components/icons/index.ts` for available icons)
- Keep components under 300 lines (ESLint warning threshold)
