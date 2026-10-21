// Private support conversations. All reads and writes pass through checked endpoints.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  app.save(new Collection({
    type: "base", name: "support_messages", listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id },
      { name: "author", type: "relation", required: true, maxSelect: 1, collectionId: users.id },
      { name: "senderRole", type: "select", required: true, maxSelect: 1, values: ["user", "admin"] },
      { name: "text", type: "text", required: true, max: 4000 },
      { name: "category", type: "select", maxSelect: 1, values: ["question", "problem", "feedback"] },
      { name: "clientKey", type: "text", required: true, max: 80 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_support_user_created ON support_messages (user, created, id)", "CREATE UNIQUE INDEX idx_support_retry ON support_messages (author, clientKey)"],
  }));
}, (app) => {
  // Preserve conversations if an application release is rolled back.
});
