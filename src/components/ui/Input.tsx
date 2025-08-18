
import { classNames } from "../../utils/helpers";

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { iconLeft?: React.ReactNode }> = ({ className, iconLeft, ...rest }) => (
  <div className="input-wrap">
    {iconLeft && <span className="icon">{iconLeft}</span>}
    <input className={classNames("input", className)} {...rest} />
  </div>
);

export default Input;
