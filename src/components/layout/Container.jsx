import clsx from 'clsx'

/**
 * Page container: centred, gutter-padded, editorial max width.
 * Wraps the `.container-page` primitive from src/index.css.
 *
 * @param {object} props
 * @param {import('react').ElementType} [props.as='div'] - element/component to render
 * @param {string} [props.className]
 * @param {import('react').ReactNode} [props.children]
 */
export default function Container({ as: Component = 'div', className, children, ...rest }) {
  return (
    <Component className={clsx('container-page', className)} {...rest}>
      {children}
    </Component>
  )
}
