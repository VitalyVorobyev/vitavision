
import { classNames } from "../../utils/helpers";

const Separator: React.FC<{ className?: string }> = ({ className }) => <div className={classNames("separator", className)} />;

export default Separator;
