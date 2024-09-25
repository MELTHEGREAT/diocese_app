
function capitalizeAfterSpace(input) {
  let words = input.value.split(' ');

  for (let i = 0; i < words.length; i++) {
    words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
  }

  input.value = words.join(' ');
}
