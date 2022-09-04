const html = require('./template/content.html');

export const Content: React.FC<{}> = () => {
  return <div data-bind="with: content" className="center-column" dangerouslySetInnerHTML={{__html: html()}}></div>;
};
