// The active creator (validated at build time, see scripts/vite-creator-plugin.ts).
import creator from 'virtual:creator';
import type { Program } from '../creators/schema';
import { fill, type TemplateVars } from './shared/template';

export default creator;

export function getProgram(id: string | null | undefined): Program | undefined {
  return creator.programs.find((p) => p.id === id);
}

export function t(template: string, vars?: TemplateVars): string {
  return fill(template, vars);
}
