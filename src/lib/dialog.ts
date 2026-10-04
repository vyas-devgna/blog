type DialogOptions = {
  title: string;
  description: string;
  action: string;
  value?: string;
  maxLength?: number;
};

// Native dialog supplies keyboard focus containment, Escape and a modal backdrop.
// User text is always inserted with textContent/value, never HTML.
export function actionDialog(options: DialogOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const trigger = document.activeElement;
    const dialog = document.createElement("dialog");
    dialog.className = "action-dialog";
    const form = document.createElement("form");
    const title = document.createElement("h2");
    title.id = "action-dialog-title";
    title.textContent = options.title;
    dialog.setAttribute("aria-labelledby", title.id);
    const description = document.createElement("p");
    description.textContent = options.description;
    description.id = "action-dialog-description";
    dialog.setAttribute("aria-describedby", description.id);
    form.append(title, description);
    let input: HTMLTextAreaElement | undefined;
    if (options.value !== undefined) {
      input = document.createElement("textarea");
      input.value = options.value;
      input.required = true;
      input.maxLength = options.maxLength ?? 6000;
      input.setAttribute("aria-label", "Updated text");
      input.rows = 6;
      form.append(input);
    }
    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "pill pill-glass";
    cancel.textContent = "Cancel";
    cancel.autofocus = !input;
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "pill pill-solid";
    submit.textContent = options.action;
    actions.append(cancel, submit);
    form.append(actions);
    dialog.append(form);
    document.body.append(dialog);
    let result: string | null = null;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      result = input ? input.value : "confirmed";
      dialog.close();
    });
    cancel.addEventListener("click", () => dialog.close());
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        if (trigger instanceof HTMLElement && trigger.isConnected)
          trigger.focus();
        resolve(result);
      },
      { once: true },
    );
    dialog.showModal();
    input?.focus();
  });
}
