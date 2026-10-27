/** The supplied artwork is displayed unchanged, cropped to its central symbol. */
export default function BrandMark({ large = false }: { large?: boolean }) {
  return <svg className={`brand-symbol${large ? " brand-symbol-large" : ""}`} viewBox="160 130 416 416" aria-hidden="true">
    <image href="/branding/logo-reference.png?v=1" width="736" height="920" />
  </svg>;
}
