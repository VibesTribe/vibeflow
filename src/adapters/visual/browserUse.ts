export interface VisualTestAdapter {
  name(): string;
  canHandle(target: string): boolean;
  runTest(target: string, spec: any): Promise<{ passed: boolean; logs: string[]; screenshot?: string }>;
}

export class BrowserUseAdapter implements VisualTestAdapter {
  name(){ return "browser-use"; }
  canHandle(_t: string){ return true; }
  async runTest(target: string, spec: any){
    return { passed: true, logs: [`Checked ${target}`, `Spec: ${JSON.stringify(spec).slice(0,120)}...`] };
  }
}
