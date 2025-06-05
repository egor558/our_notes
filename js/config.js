const ENCRYPTED_TOKEN = 'eTBfX3hDbHhKbWZCUmlUa1RnZ3NLZjFzUk14UjFhMGM3V0MzaTNsMmk1MWtNUm1kQXVmd0E='; // Получите через btoa('ваш_токен')
const DIARY_FILE_PATH = 'diary/posts.json';
function getDecryptedToken() {
  return atob(ENCRYPTED_TOKEN); // Расшифровка
}

