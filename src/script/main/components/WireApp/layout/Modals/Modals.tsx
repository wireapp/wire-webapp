const html = require('./template/modals.html');

export const Modals: React.FC<{}> = () => {
  return <div data-bind="with: modals" id="modals" dangerouslySetInnerHTML={{__html: html()}}></div>;
};
