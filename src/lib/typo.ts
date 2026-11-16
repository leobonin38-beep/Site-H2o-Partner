/** Typographie française : espaces insécables avant : ; ? ! et à l'intérieur des guillemets « ». */
export function fr(s: string): string {
  return s
    .replace(/ ([:;?!»])/g, ' $1')
    .replace(/« /g, '« ');
}
