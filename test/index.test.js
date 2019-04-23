import {configure} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({adapter: new Adapter()});

const context = require.context('../src/script/auth', true, /.test\.jsx?$/);
context.keys().forEach(context);
