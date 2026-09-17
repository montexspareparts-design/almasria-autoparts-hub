export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
}

export const Card = ({ as: Tag = "div", className = "", children, ...rest }: CardProps) => (
  <Tag className={`ds-card ${className}`} {...rest}>
    {children}
  </Tag>
);

export default Card;
