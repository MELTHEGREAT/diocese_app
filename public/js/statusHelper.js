// statusHelper.js

function getStatusClass(status) {
    switch (status) {
      case 'Accepted':
        return 'px-2 py-1 font-semibold leading-tight text-green-700 bg-green-100 rounded-full dark:bg-green-700 dark:text-green-100';
      case 'Pending':
        return 'px-2 py-1 font-semibold leading-tight text-yellow-700 bg-yellow-100 rounded-full dark:bg-yellow-700 dark:text-yellow-100';
      case 'Declined':
        return 'px-2 py-1 font-semibold leading-tight text-red-700 bg-red-100 rounded-full dark:bg-red-700 dark:text-red-100';
      default:
        return ''; 
    }
  }
  