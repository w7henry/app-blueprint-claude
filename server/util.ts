// Same encoding as the browser (src/lib/funnel.ts encodeAnswers), for the "your plan" link.
export function encodeAnswersServer(a: Record<string, string>): string {
  return Buffer.from(JSON.stringify(a)).toString('base64url');
}
