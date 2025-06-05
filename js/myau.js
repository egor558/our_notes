document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('myau-form');
    const mediaPreview = document.getElementById('media-preview');
    let mediaFiles = [];
    let uploadController = null; // Для отмены загрузки
    let isUploading = false;

    function showNotification(message, isSuccess) {
        const notification = document.createElement('div');
        notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    document.getElementById('image-upload').setAttribute('multiple', '');
    document.getElementById('video-upload').setAttribute('multiple', '');

    document.getElementById('image-upload').addEventListener('change', handleMediaUpload);
    document.getElementById('video-upload').addEventListener('change', handleMediaUpload);
    
    function handleMediaUpload(e) {
        if (isUploading) {
            showNotification('Дождитесь завершения текущей загрузки', false);
            return;
        }
        
        const files = e.target.files;
        const maxSize = 350 * 1024 * 1024;
        
        let totalSize = 0;
        for (let file of files) {
            totalSize += file.size;
        }
        
        if (totalSize > maxSize) {
            showNotification(`Общий размер файлов превышает 350MB`, false);
            return;
        }
            
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (file.size > maxSize) {
                showNotification(`Файл ${file.name} слишком большой (макс. 350MB)`, false);
                continue;
            }
            
            mediaFiles.push(file);
            
            const reader = new FileReader();
            reader.onload = function(event) {
                createMediaPreview(file, event.target.result);
            };
            
            if (file.type.includes('image')) {
                reader.readAsDataURL(file);
            } else if (file.type.includes('video')) {
                reader.readAsDataURL(file);
            }
        }
    }
    
    function createMediaPreview(file, src) {
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';
        
        if (file.type.includes('image')) {
            mediaItem.innerHTML = `
                <img src="${src}" alt="Preview">
                <button class="delete-media" data-name="${file.name}">×</button>
            `;
        } else if (file.type.includes('video')) {
            mediaItem.innerHTML = `
                <video controls>
                    <source src="${src}" type="${file.type}">
                </video>
                <button class="delete-media" data-name="${file.name}">×</button>
            `;
        }
        
        mediaPreview.appendChild(mediaItem);
        
        mediaItem.querySelector('.delete-media').addEventListener('click', function() {
            mediaItem.remove();
            mediaFiles = mediaFiles.filter(f => f.name !== this.getAttribute('data-name'));
        });
    }
    
    function createProgressBar() {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        
        progressContainer.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">0%</div>
            <button id="cancel-upload" class="btn btn--primary" style="margin-top: 10px; background-color: #F44336;">Отменить загрузку</button>
        `;
        
        form.appendChild(progressContainer);
        
        // Добавляем обработчик отмены
        document.getElementById('cancel-upload').addEventListener('click', cancelUpload);
        
        return progressContainer;
    }
    
    function cancelUpload() {
        if (uploadController) {
            uploadController.abort();
            showNotification('Загрузка отменена', false);
            isUploading = false;
            document.querySelector('.progress-container')?.remove();
        }
    }
    
    function updateProgress(progressContainer, percent, message = '') {
        const fill = progressContainer.querySelector('.progress-fill');
        const text = progressContainer.querySelector('.progress-text');
        
        fill.style.width = `${percent}%`;
        text.textContent = message || `${percent}%`;
    }

    // Проверяем параметры URL для режима редактирования
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId) {
        loadPostForEdit(editId);
    }

    async function loadPostForEdit(id) {
        try {
            const posts = await loadPostsFromYandisk();
            const postToEdit = posts.find(post => post.id === parseInt(id));
            
            if (!postToEdit) {
                showNotification('Запись для редактирования не найдена', false);
                return;
            }
            
            document.getElementById('myau-title').value = postToEdit.title;
            document.getElementById('myau-description').value = postToEdit.description || '';
            
            if (postToEdit.rating) {
                document.querySelector(`input[name="rating"][value="${postToEdit.rating}"]`).checked = true;
            }
            
            mediaPreview.innerHTML = '';
            mediaFiles = [];
            
            if (postToEdit.media && postToEdit.media.length > 0) {
                postToEdit.media.forEach(media => {
                    const file = new File([], media.name, { type: `${media.type}/${media.name.split('.').pop()}` });
                    mediaFiles.push(file);
                    createMediaPreview(file, media.url);
                });
            }
            
            form.dataset.editMode = 'true';
            form.dataset.editId = id;
            form.dataset.originalMedia = JSON.stringify(postToEdit.media || []);
            
            form.querySelector('button[type="submit"]').textContent = 'Обновить запись';
            
        } catch (error) {
            console.error('Ошибка загрузки записи:', error);
            showNotification('Ошибка загрузки записи для редактирования', false);
        }
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (isUploading) {
            showNotification('Уже идет загрузка, дождитесь завершения', false);
            return;
        }
        
        const title = document.getElementById('myau-title').value;
        const description = document.getElementById('myau-description').value;
        const rating = document.querySelector('input[name="rating"]:checked')?.value || null;
        
        if (!title) {
            showNotification('Пожалуйста, добавьте заголовок', false);
            return;
        }
        
        try {
            isUploading = true;
            const progressContainer = createProgressBar();
            updateProgress(progressContainer, 0, 'Подготовка...');
            
            const isEditMode = this.dataset.editMode === 'true';
            const postId = isEditMode ? parseInt(this.dataset.editId) : Date.now();
            
            // Создаем новый AbortController для возможности отмены
            uploadController = new AbortController();
            
            await saveToYandexDisk(
                title, 
                description, 
                rating, 
                mediaFiles, 
                (progress, message) => {
                    updateProgress(progressContainer, progress, message);
                }, 
                isEditMode, 
                postId,
                uploadController.signal
            );
            
            form.reset();
            mediaPreview.innerHTML = '';
            mediaFiles = [];
            
            if (isEditMode) {
                delete this.dataset.editMode;
                delete this.dataset.editId;
                delete this.dataset.originalMedia;
                this.querySelector('button[type="submit"]').textContent = 'Опубликовать';
                
                // Удаляем параметр из URL
                const url = new URL(window.location.href);
                url.searchParams.delete('edit');
                window.history.replaceState({}, '', url);
            }
            
            setTimeout(() => {
                progressContainer.remove();
            }, 1000);
            
            showNotification(isEditMode ? 'Запись успешно обновлена!' : 'Мяу успешно сохранено!', true);
            
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            if (error.name !== 'AbortError') {
                showNotification(`Ошибка при загрузке: ${error.message}`, false);
            }
        } finally {
            isUploading = false;
            uploadController = null;
        }
    });
    
    async function saveToYandexDisk(
    title, 
    description, 
    rating, 
    files, 
    progressCallback, 
    isEditMode = false, 
    postId = Date.now(),
    abortSignal
) {
    try {
        progressCallback(5, 'Загрузка существующих записей...');
        const posts = await loadPostsFromYandisk();
        
        let postInfo;
        if (isEditMode) {
            const postIndex = posts.findIndex(post => post.id === postId);
            if (postIndex === -1) throw new Error('Пост не найден');
            
            postInfo = posts[postIndex];
            postInfo.title = title;
            postInfo.description = description;
            postInfo.rating = rating;
            
            const originalMedia = JSON.parse(form.dataset.originalMedia);
            const remainingMediaNames = files.map(file => file.name);
            const mediaToDelete = originalMedia.filter(media => !remainingMediaNames.includes(media.name));
            
            for (const media of mediaToDelete) {
                if (abortSignal?.aborted) throw new DOMException('Aborted', 'AbortError');
                await deleteFileFromYandexDisk(media.path, abortSignal);
                postInfo.media = postInfo.media.filter(m => m.path !== media.path);
            }
        } else {
            postInfo = {
                id: postId,
                title,
                description,
                rating,
                date: new Date().toISOString(),
                media: []
            };
            posts.push(postInfo);
        }
        
        const totalFiles = files.length;
        let uploadedFiles = 0;
        
        for (let i = 0; i < files.length; i++) {
            if (abortSignal?.aborted) throw new DOMException('Aborted', 'AbortError');
            
            const file = files[i];
            const isImage = file.type.includes('image');
            const folder = isImage ? 'images' : 'videos';
            const fileName = `post_${postId}_${i}.${file.name.split('.').pop()}`;
            const remotePath = `diary/${folder}/${fileName}`;
            
            if (isEditMode && postInfo.media.some(m => m.name === fileName)) continue;
            
            try {
                const progress = 10 + Math.floor((i / totalFiles) * 80);
                progressCallback(progress, `Загрузка ${i+1}/${totalFiles}: ${file.name}`);
                
                // 1. Получаем URL для загрузки
                const uploadUrl = `https://cloud-api.yandex.net/v1/disk/resources/upload?path=/${encodeURIComponent(remotePath)}&overwrite=true`;
                
                const uploadResponse = await fetchWithRetry(uploadUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `OAuth ${getDecryptedToken()}`,
                        'Accept': 'application/json'
                    },
                    signal: abortSignal
                });
                
                if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json();
                    throw new Error(errorData.message || 'Не удалось получить ссылку для загрузки');
                }
                
                const uploadData = await uploadResponse.json();
                
                // 2. Загружаем файл
                const uploadResult = await fetchWithRetry(uploadData.href, {
                    method: 'PUT',
                    body: file,
                    headers: {
                        'Content-Type': file.type
                    },
                    signal: abortSignal,
                    timeout: 300000 // 5 минут для больших файлов
                });
                
                if (!uploadResult.ok) {
                    throw new Error('Не удалось загрузить файл');
                }
                
                // 3. Публикуем файл
                const publishUrl = `https://cloud-api.yandex.net/v1/disk/resources/publish?path=/${encodeURIComponent(remotePath)}`;
                
                const publishResponse = await fetchWithRetry(publishUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `OAuth ${getDecryptedToken()}`
                    },
                    signal: abortSignal
                });
                
                if (!publishResponse.ok) {
                    throw new Error('Не удалось опубликовать файл');
                }
                
                // 4. Получаем прямую ссылку
                const publishData = await publishResponse.json();
                const directLink = await getDirectFileLink(publishData.href, abortSignal);
                
                if (!isEditMode || !postInfo.media.some(m => m.name === fileName)) {
                    postInfo.media.push({
                        type: isImage ? 'image' : 'video',
                        url: directLink,
                        name: fileName,
                        path: remotePath
                    });
                }
                
                uploadedFiles++;
                
            } catch (error) {
                console.error(`Ошибка загрузки файла ${file.name}:`, error);
                throw new Error(`Файл ${file.name}: ${error.message}`);
            }
        }

        progressCallback(90, 'Сохранение записи...');
        await savePostsToYandisk(posts, abortSignal);
        progressCallback(100, 'Готово!');
        
    } catch (error) {
        console.error('Ошибка в saveToYandexDisk:', error);
        throw error;
    }
}

// Функция с повторными попытками
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 60000);
        
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok && retries > 0) {
            await new Promise(res => setTimeout(res, delay));
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        
        return response;
        
    } catch (error) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, delay));
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw error;
    }
}
    
    async function deleteFileFromYandexDisk(path) {
        const url = `https://cloud-api.yandex.net/v1/disk/resources?path=/${encodeURIComponent(path)}&permanently=true`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `OAuth ${getDecryptedToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Не удалось удалить файл с Яндекс.Диска');
        }
    }
    
    async function getDirectFileLink(publicUrl, abortSignal) {
        try {
            const response = await fetch(publicUrl, {
                headers: {
                    'Authorization': `OAuth ${getDecryptedToken()}`
                },
                signal: abortSignal
            });
            
            if (!response.ok) throw new Error('Не удалось получить информацию о файле');
            
            const data = await response.json();
            
            if (data.type === 'file') {
                if (data.media_type === 'image') {
                    const downloadUrl = `https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(data.path)}`;
                    const downloadResponse = await fetch(downloadUrl, {
                        headers: {
                            'Authorization': `OAuth ${getDecryptedToken()}`
                        },
                        signal: abortSignal
                    });
                    
                    if (!downloadResponse.ok) throw new Error('Не удалось получить ссылку на скачивание');
                    
                    const downloadData = await downloadResponse.json();
                    return downloadData.href;
                } else {
                    return data.file;
                }
            }
            
            throw new Error('Неизвестный тип ресурса');
        } catch (error) {
            console.error('Ошибка получения прямой ссылки:', error);
            throw error;
        }
    }
    
    async function savePostsToYandisk(posts, abortSignal) {
        try {
            const blob = new Blob([JSON.stringify(posts)], { type: 'application/json' });
            const file = new File([blob], 'posts.json');
            
            const uploadUrl = `https://cloud-api.yandex.net/v1/disk/resources/upload?path=diary/posts.json&overwrite=true`;
            
            const response = await fetch(uploadUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `OAuth ${getDecryptedToken()}`,
                    'Accept': 'application/json'
                },
                signal: abortSignal
            });
            
            if (!response.ok) throw new Error('Не удалось получить URL для загрузки');
            
            const { href } = await response.json();
            
            const uploadResponse = await fetch(href, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: abortSignal
            });
            
            if (!uploadResponse.ok) throw new Error('Ошибка загрузки файла');
            
            return true;
        } catch (error) {
            console.error('Ошибка сохранения на Яндекс.Диск:', error);
            throw error;
        }
    }
    
    async function loadPostsFromYandisk() {
        try {
            const downloadUrl = `https://cloud-api.yandex.net/v1/disk/resources/download?path=diary/posts.json`;
            
            const response = await fetch(downloadUrl, {
                headers: {
                    'Authorization': `OAuth ${getDecryptedToken()}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) return [];
                throw new Error('Не удалось получить ссылку для скачивания');
            }
            
            const { href } = await response.json();
            
            const fileResponse = await fetch(href);
            if (!fileResponse.ok) throw new Error('Ошибка загрузки файла');
            
            return await fileResponse.json();
        } catch (error) {
            console.error('Ошибка загрузки с Яндекс.Диска:', error);
            return [];
        }
    }
});