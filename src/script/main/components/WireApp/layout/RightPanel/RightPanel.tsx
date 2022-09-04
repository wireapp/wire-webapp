const html = require('./template/right-panel.html');

export const RightPanel: React.FC<{}> = () => {
  return <div data-bind="with: panel" className="right-column" dangerouslySetInnerHTML={{__html: html()}}></div>;
};
