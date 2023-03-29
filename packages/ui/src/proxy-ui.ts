export class ProxyUI {
  private constructor() {
    // internal constructor
  }

  static async init(): Promise<void> {
    const ui = new ProxyUI();

    await ui.render();
  }

  async render(): Promise<void> {
    // todo
  }
}
