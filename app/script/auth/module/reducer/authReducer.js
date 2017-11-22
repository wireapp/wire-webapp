import * as AuthActionCreator from '../action/creator/AuthActionCreator';
import * as UserActionCreator from '../action/creator/UserActionCreator';

export const initialState = {
  account: {
    accent_id: undefined,
    assets: undefined,
    email: undefined,
    email_code: undefined,
    invitation_code: undefined,
    label: undefined,
    locale: undefined,
    name: undefined,
    password: undefined,
    phone: undefined,
    phone_code: undefined,
    team: undefined,
  },
  error: null,
  fetched: false,
  fetching: false,
  isAuthenticated: false,
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case AuthActionCreator.LOGIN_START:
    case AuthActionCreator.REGISTER_JOIN_START:
    case AuthActionCreator.REGISTER_PERSONAL_START:
    case AuthActionCreator.REGISTER_TEAM_START: {
      return {
        ...state,
        error: null,
        fetching: true,
        isAuthenticated: false,
      };
    }
    case AuthActionCreator.REFRESH_START: {
      return {
        ...state,
        error: null,
        fetching: true,
      };
    }
    case AuthActionCreator.REFRESH_FAILED: {
      return {
        ...state,
        fetching: false,
        isAuthenticated: false,
      };
    }
    case AuthActionCreator.LOGIN_FAILED:
    case AuthActionCreator.REGISTER_JOIN_FAILED:
    case AuthActionCreator.REGISTER_PERSONAL_FAILED:
    case AuthActionCreator.REGISTER_TEAM_FAILED: {
      return {
        ...state,
        error: action.payload,
        fetching: false,
        isAuthenticated: false,
      };
    }
    case AuthActionCreator.LOGIN_SUCCESS:
    case AuthActionCreator.REFRESH_SUCCESS:
    case AuthActionCreator.REGISTER_JOIN_SUCCESS:
    case AuthActionCreator.REGISTER_PERSONAL_SUCCESS:
    case AuthActionCreator.REGISTER_TEAM_SUCCESS: {
      return {
        ...state,
        account: {...initialState.account},
        fetched: true,
        fetching: false,
        isAuthenticated: true,
      };
    }
    case AuthActionCreator.REGISTER_PUSH_ACCOUNT_DATA: {
      return {...state, account: {...state.account, ...action.payload}};
    }
    case AuthActionCreator.REGISTER_RESET_ACCOUNT_DATA: {
      return {...state, account: {...initialState.account}};
    }
    case AuthActionCreator.LOGOUT_SUCCESS: {
      return {...initialState};
    }
    case AuthActionCreator.AUTH_RESET_ERROR: {
      return {...state, error: null};
    }
    default: {
      return state;
    }
  }
}
