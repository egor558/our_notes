const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const ENCRYPTED_TOKEN = 'eTBfX3hDbHhKbWZCUmlUa1RnZ3NLZjFzUk14UjFhMGM3V0MzaTNsMmk1MWtNUm1kQXVmd0E=';
const UPLOAD_URL = 'https://cloud-api.yandex.net/v1/disk/resources/upload';

async function uploadToYandexDisk(filePath, fileName) {
  // 1. Получаем ссылку для загрузки
  const { data } = await axios.get(UPLOAD_URL, {
    params: { path: `/diary/${fileName}`, overwrite: true },
    headers: { 'Authorization': `OAuth ${OAUTH_TOKEN}` }
  });

  // 2. Загружаем файл
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  await axios.put(data.href, form, {
    headers: form.getHeaders()
  });

  // 3. Получаем публичную ссылку
  const { data: meta } = await axios.get('https://cloud-api.yandex.net/v1/disk/resources', {
    params: { path: `/diary/${fileName}` },
    headers: { 'Authorization': `OAuth ${OAUTH_TOKEN}` }
  });

  return meta.file; // Ссылка вида https://downloader.disk.yandex.ru/disk/...
}

// Пример вызова
uploadToYandexDisk('cat.jpg', 'photo1.jpg')
  .then(url => console.log('Файл доступен по ссылке:', url));
