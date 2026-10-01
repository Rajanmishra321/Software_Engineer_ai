import { getFileType } from "../../utils/fileTypes";

/** File-type icon, coloured like an editor's file explorer. */
const FileIcon = ({ path, className = "" }) => {
  const { icon, color } = getFileType(path);
  return <i className={`${icon} ${color} ${className}`} />;
};

export default FileIcon;
