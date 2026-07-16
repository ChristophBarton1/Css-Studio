export default defineBackground(() => {
  // Clicking the toolbar action opens the native Chrome side panel.
  void browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => {
      console.error('Style Studio: unable to enable side panel open-on-click', error);
    });
});
