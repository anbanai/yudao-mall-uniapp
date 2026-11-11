export function isPhoneAuthorized(userInfo = {}) {
  return Boolean(userInfo?.mobile);
}

export function isFormalLogin(isLogin, userInfo = {}) {
  return Boolean(isLogin && isPhoneAuthorized(userInfo));
}

export function createAuthState({
  isLogin = false,
  userInfo = {},
  getUserInfo = async () => userInfo,
} = {}) {
  let currentUserInfo = userInfo;
  let userInfoLoaded = false;
  let userInfoPromise;

  return {
    get isLogin() {
      return isLogin;
    },
    get userInfo() {
      return currentUserInfo;
    },
    get userInfoLoaded() {
      return userInfoLoaded;
    },
    get isPhoneAuthorized() {
      return isPhoneAuthorized(currentUserInfo);
    },
    get isFormalLogin() {
      return isFormalLogin(isLogin, currentUserInfo);
    },
    async ensureUserInfo() {
      if (!isLogin || userInfoLoaded) {
        return currentUserInfo;
      }
      if (!userInfoPromise) {
        userInfoPromise = Promise.resolve(getUserInfo()).then((data) => {
          currentUserInfo = data || {};
          userInfoLoaded = true;
          return currentUserInfo;
        });
      }
      return userInfoPromise;
    },
  };
}
