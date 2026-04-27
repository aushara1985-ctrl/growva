# Revenue Engine — Test Suite

## Structure

```
src/__tests__/
├── scoring.test.ts      # Unit tests for calculateProductScore
├── templates.test.ts    # Unit tests for templates library  
├── api.test.ts          # API route tests (events, products, decisions)
├── scheduler.test.ts    # Growth loop tests
└── integration.test.ts  # Full lifecycle tests
```

## Run

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Coverage targets

| Area | Target |
|------|--------|
| Statements | 80% |
| Functions | 80% |
| Lines | 80% |
| Branches | 70% |

## What's tested

### scoring.test.ts (30 tests)
- Signal detection: accelerating / steady / slowing / stalled
- Momentum calculation with experiment activity + recency bonus
- Conversion health with win rate + patterns
- Revenue velocity with week-over-week growth
- Growth chance composite score
- Overall score bounds (0-100)
- Recommendations per signal

### templates.test.ts (25 tests)
- All templates have required fields
- No duplicate IDs
- Valid type/channel values
- Category filtering
- ID lookup
- Category detection from product description (EN + AR)
- Template formula filling with product context

### api.test.ts (15 tests)
- Events: auth, validation, creation, experimentId tracking
- Products: creation, validation, listing
- Decisions: not found, kill/scale execution, AI call

### scheduler.test.ts (12 tests)
- No-op when no products
- Generates experiments when none active
- Calls decide for each active experiment
- Executes kill/scale/iterate correctly
- Saves winning patterns on scale
- Generates daily brief
- Handles AI failures gracefully
- Multiple products processed independently

### integration.test.ts (5 tests)
- Full lifecycle: create → start → track → decide
- Scale + execute assets flow
- Edge cases: all event types, bad IDs, no templates
