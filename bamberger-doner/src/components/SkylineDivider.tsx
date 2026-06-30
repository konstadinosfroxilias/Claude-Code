interface SkylineDividerProps {
  className?: string
  /** flip vertically (skyline hanging from top) */
  flip?: boolean
  color?: string
}

/**
 * A faint Bamberg-meets-Berlin skyline silhouette — cathedral spires, a town
 * hall, rooftops and a Berlin TV-tower nod. Drawn in SVG, no image needed.
 */
export default function SkylineDivider({
  className = '',
  flip = false,
  color = 'currentColor',
}: SkylineDividerProps) {
  return (
    <svg
      viewBox="0 0 1200 80"
      preserveAspectRatio="none"
      className={`block w-full ${flip ? 'rotate-180' : ''} ${className}`}
      aria-hidden
    >
      <path
        fill={color}
        d="M0,80 L0,58 L40,58 L46,44 L52,58 L96,58 L96,40 L120,40 L120,30 L132,30 L132,40 L156,40 L156,58
           L210,58 L210,34 L222,22 L234,34 L234,58 L286,58 L290,48 L296,30 L302,48 L306,58
           L360,58 L360,42 L384,42 L384,26 L396,26 L396,42 L420,42 L420,58
           L470,58 L476,40 L482,58 L520,58 L520,20 L528,20 L528,10 L536,10 L536,20 L544,20 L544,58
           L600,58 L606,46 L612,30 L618,46 L624,58 L680,58 L680,38 L704,38 L704,24 L716,24 L716,38 L740,38 L740,58
           L792,58 L798,44 L804,58 L856,58 L856,36 L868,26 L880,36 L880,58
           L930,58 L936,42 L942,58 L984,58 L984,30 L996,30 L996,18 L1008,18 L1008,30 L1020,30 L1020,58
           L1074,58 L1080,46 L1086,32 L1092,46 L1098,58 L1152,58 L1152,40 L1176,40 L1176,52 L1200,52 L1200,80 Z"
      />
    </svg>
  )
}
