function navigateTo(route) {
    window.location.href = route;
   }

function confirmLogout() {
    var logout = confirm("Are you sure you want to logout?");
    if (logout) {
      window.location.href = "/logout"; // Redirect to the logout URL
    }
  }

  