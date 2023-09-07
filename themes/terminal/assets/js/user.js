let userInfo;

export async function getUserInfo() {
  if (userInfo) {
    return userInfo;
  }

  const resp = await fetch("/.auth/me");
  const { clientPrincipal } = await resp.json();

  userInfo = clientPrincipal;

  return userInfo;
}

export async function displayUserInfo() {
  const clientPrincipal = await getUserInfo();

  document.querySelector('.footer .user-info').innerHTML = `
    <div class="user-name">
      Currently signed in as ${clientPrincipal.userDetails}
    </div>
    <a href="/.auth/logout" class="logout">
      Sign Out
    </a>
  `;
}
