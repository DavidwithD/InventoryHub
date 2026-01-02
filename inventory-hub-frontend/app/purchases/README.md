This folder contains refactored parts for the Purchases page.

Structure:
- components/: UI components (PurchasesTable, PurchaseDialog, PurchasesToolbar)
- hooks/: custom hooks (usePurchases, usePurchaseForm, useExchangeRate)
- types/: local types used by the purchases page
- utils.ts: small pure helpers

Next steps:
- Wire the new components/hooks into `app/purchases/page.tsx`
- Complete error handling and snackbar integration
- Add tests if desired
