import React from 'react';
import { Link, type LinkProps } from 'react-router-dom';

/**
 * Shared button styling so every action/navigation control uses the design
 * system instead of ad-hoc inline styles. `Button` renders a <button>,
 * `ButtonLink` renders a react-router <Link> with the same look.
 *
 * Variants:
 *  - primary   → festive gold gradient (the app's main CTA, dark text)
 *  - secondary → flat dark fill, white text
 *  - blue / success / accent / danger → flat coloured fill, white text
 *  - ghost     → discreet translucent chip (matches .back-button) for back /
 *                secondary navigation links
 * Pass `block` for a full-width button.
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'blue'
  | 'success'
  | 'accent'
  | 'danger'
  | 'ghost';

function btnClass(variant: ButtonVariant, block?: boolean, extra?: string): string {
  return ['btn', `btn--${variant}`, block ? 'btn--block' : '', extra ?? '']
    .filter(Boolean)
    .join(' ');
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  block,
  className,
  type = 'button',
  children,
  ...rest
}) => (
  <button type={type} className={btnClass(variant, block, className)} {...rest}>
    {children}
  </button>
);

interface ButtonLinkProps extends Omit<LinkProps, 'className'> {
  variant?: ButtonVariant;
  block?: boolean;
  className?: string;
}

export const ButtonLink: React.FC<ButtonLinkProps> = ({
  variant = 'primary',
  block,
  className,
  children,
  ...rest
}) => (
  <Link className={btnClass(variant, block, className)} {...rest}>
    {children}
  </Link>
);
