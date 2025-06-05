document.addEventListener('DOMContentLoaded', function() {
    const diaryPosts = document.getElementById('diary-posts');
    let mediaFiles = [];
    
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

    async function loadPosts() {
        try {
            const posts = await loadPostsFromYandisk();
            
            if (posts.length === 0) {
                diaryPosts.innerHTML = `
                    <div class="empty-state">
                        <p>Пока здесь ничего нет.</p>
                        <p>Добавьте первое "Мяу" на соответствующей странице!</p>
                    </div>
                `;
                return;
            }
            
            diaryPosts.innerHTML = '';
            const sortedPosts = posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            createTimeline(sortedPosts);
            
            const mediaObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const mediaElement = entry.target;
                        if (mediaElement.dataset.src) {
                            mediaElement.src = mediaElement.dataset.src;
                            mediaElement.removeAttribute('data-src');
                        }
                        mediaObserver.unobserve(mediaElement);
                    }
                });
            }, { 
                rootMargin: '200px',
                threshold: 0.1
            });
            
            sortedPosts.forEach(post => {
                const postElement = createPostElement(post);
                diaryPosts.appendChild(postElement);
                
                postElement.querySelectorAll('.lazy-media').forEach(media => {
                    mediaObserver.observe(media);
                });
            });
            
            setupPostActions();
            
        } catch (error) {
            console.error('Ошибка загрузки постов:', error);
            showNotification('Ошибка загрузки записей', false);
        }
    }
    
    function createPostElement(post) {
        const postElement = document.createElement('div');
        postElement.className = 'diary-post';
        postElement.dataset.id = post.id;
        postElement.dataset.date = new Date(post.date).getTime();
        
        const date = new Date(post.date);
        const formattedDate = date.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const moodEmoji = getMoodEmoji(post.rating);
        const moodDisplay = post.rating ? `<span class="mood-emoji" title="${getMoodTitle(post.rating)}">${moodEmoji}</span>` : '';
        
        let mediaContent = '';
        if (post.media && post.media.length > 0) {
            mediaContent = '<div class="media-grid">';
            
            post.media.forEach(media => {
                const isImage = media.type === 'image';
                
                mediaContent += `
                    <div class="media-card ${isImage ? 'image-card' : 'video-card'}" 
                         onclick="handleMediaClick(event, '${media.url}', '${media.type}')">
                        ${isImage ? 
                            `<img src="${media.url}" alt="${media.name}" 
                                 onerror="handleMediaError(this, '${media.url}', '${media.type}')">` : 
                            `<video class="lazy-media" controls
                                           data-src="${media.url}"
                                           onerror="handleMediaError(this, '${media.url}', '${media.type}')">
                                        <source type="video/mp4">
                                        Ваш браузер не поддерживает видео.
                                    </video>`
                        }
                        <div class="media-name">${media.name}</div>
                    </div>
                `;
            });
            
            mediaContent += '</div>';
        }
        
        postElement.innerHTML = `
            <div class="post-header">
                <h3 class="post-title">${post.title || 'Без названия'} ${moodDisplay}</h3>
                <div class="post-date">${formattedDate}</div>
            </div>
            <div class="post-content">
                ${post.description || ''}
            </div>
            ${mediaContent}
            <div class="post-actions">
                <button class="post-action" data-action="edit">Редактировать</button>
                <button class="post-action" data-action="delete">Удалить</button>
            </div>
        `;
        
        return postElement;
    }

    function getMoodEmoji(rating) {
        if (!rating) return '';
        const emojis = ['😢', '😕', '😐', '🙂', '😊'];
        return emojis[Math.min(Math.max(parseInt(rating) - 1, 0), 4)];
    }

    function getMoodTitle(rating) {
        if (!rating) return '';
        const titles = ['Ужасно', 'Плохо', 'Нормально', 'Хорошо', 'Отлично'];
        return titles[Math.min(Math.max(parseInt(rating) - 1, 0), 4)];
    }
    
    function createTimeline(posts) {
        if (posts.length === 0) return;
        
        const timelineContainer = document.createElement('div');
        timelineContainer.className = 'timeline-container';
        
        const postsByYearMonth = {};
        posts.forEach(post => {
            const date = new Date(post.date);
            const year = date.getFullYear();
            const month = date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
            
            if (!postsByYearMonth[year]) postsByYearMonth[year] = {};
            if (!postsByYearMonth[year][month]) postsByYearMonth[year][month] = [];
            
            postsByYearMonth[year][month].push(post);
        });
        
        let timelineHTML = `
            <div class="timeline-header">
                <h3 class="timeline-title">Хронология публикаций</h3>
            </div>
            <div class="timeline-scroll">
        `;
        
        const years = Object.keys(postsByYearMonth).sort((a, b) => b - a);
        
        years.forEach(year => {
            timelineHTML += `<div class="timeline-year">${year}</div>`;
            
            const months = Object.keys(postsByYearMonth[year]).sort((a, b) => {
                return new Date(b) - new Date(a);
            });
            
            months.forEach(month => {
                timelineHTML += `
                    <div class="timeline-month-section">
                        <div class="timeline-month-header">${month}</div>
                        <div class="timeline-month-posts">
                `;
                
                postsByYearMonth[year][month].forEach(post => {
                    const postDate = new Date(post.date);
                    timelineHTML += `
                        <div class="timeline-post" data-id="${post.id}">
                            <span class="post-day">${postDate.getDate()}</span>
                            <span class="post-title">${post.title || 'Без названия'}</span>
                        </div>
                    `;
                });
                
                timelineHTML += `
                        </div>
                    </div>
                `;
            });
        });
        
        timelineHTML += `</div>`;
        timelineContainer.innerHTML = timelineHTML;
        
        diaryPosts.parentNode.insertBefore(timelineContainer, diaryPosts);
        
        timelineContainer.addEventListener('click', (e) => {
            const postElement = e.target.closest('.timeline-post');
            if (postElement) {
                const postId = parseInt(postElement.dataset.id);
                const targetPost = document.querySelector(`.diary-post[data-id="${postId}"]`);
                if (targetPost) {
                    targetPost.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                    targetPost.classList.add('highlight');
                    setTimeout(() => {
                        targetPost.classList.remove('highlight');
                    }, 1500);
                }
            }
        });
    }
    
    function setupPostActions() {
        document.querySelectorAll('.post-action[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = parseInt(this.closest('.diary-post').dataset.id);
                deletePost(postId);
            });
        });
        
        document.querySelectorAll('.post-action[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = parseInt(this.closest('.diary-post').dataset.id);
                editPost(postId);
            });
        });
    }
    
    async function deletePost(id) {
        if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;
        
        try {
            const posts = await loadPostsFromYandisk();
            const postToDelete = posts.find(post => post.id === id);
            
            if (!postToDelete) return;
            
            if (postToDelete.media && postToDelete.media.length > 0) {
                for (const media of postToDelete.media) {
                    await deleteFileFromYandexDisk(media.path);
                }
            }
            
            const updatedPosts = posts.filter(post => post.id !== id);
            await savePostsToYandisk(updatedPosts);
            
            loadPosts();
            showNotification('Запись успешно удалена', true);
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            showNotification('Ошибка при удалении записи', false);
        }
    }
    
    async function editPost(id) {
        window.location.href = `myau.html?edit=${id}`;
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
    
    async function savePostsToYandisk(posts) {
        try {
            const blob = new Blob([JSON.stringify(posts)], { type: 'application/json' });
            const file = new File([blob], 'posts.json');
            
            const uploadUrl = `https://cloud-api.yandex.net/v1/disk/resources/upload?path=diary/posts.json&overwrite=true`;
            
            const response = await fetch(uploadUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `OAuth ${getDecryptedToken()}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Не удалось получить URL для загрузки');
            
            const { href } = await response.json();
            
            const uploadResponse = await fetch(href, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': 'application/json'
                }
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
            const response = await fetch('https://cloud-api.yandex.net/v1/disk/resources/download?path=diary/posts.json', {
                headers: {
                    'Authorization': `OAuth ${getDecryptedToken()}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) return [];
                throw new Error(`Ошибка ${response.status}: ${await response.text()}`);
            }

            const { href } = await response.json();
            const fileResponse = await fetch(href);
            return await fileResponse.json();
            
        } catch (error) {
            console.error('Ошибка загрузки с Яндекс.Диска:', error);
            return [];
        }
    }
    
    window.createFullscreenViewer = function(mediaUrl, mediaType) {
        const overlay = document.createElement('div');
        overlay.className = 'fullscreen-overlay';
        
        const content = document.createElement('div');
        content.className = 'fullscreen-content';
        
        const closeBtn = document.createElement('span');
        closeBtn.className = 'close-fullscreen';
        closeBtn.innerHTML = '&times;';
        
        if (mediaType === 'image') {
            const img = document.createElement('img');
            img.src = mediaUrl;
            img.alt = 'Fullscreen image';
            content.appendChild(img);
        } else if (mediaType === 'video') {
            const video = document.createElement('video');
            video.src = mediaUrl;
            video.controls = true;
            video.autoplay = true;
            video.playsInline = false;
            content.appendChild(video);
        }
        
        content.appendChild(closeBtn);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        const closeViewer = () => {
            document.body.removeChild(overlay);
        };
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target === closeBtn) {
                closeViewer();
            }
        });
        
        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') {
                closeViewer();
                document.removeEventListener('keydown', handler);
            }
        });
    };
    
    window.handleMediaClick = function(e, url, type) {
        e.preventDefault();
        e.stopPropagation();
        
        if (type === 'video') {
            const videoElement = e.currentTarget.querySelector('video');
            if (videoElement) {
                videoElement.pause();
                videoElement.currentTime = 0;
            }
        }
        
        createFullscreenViewer(url, type);
    };
    
    window.handleMediaError = function(element, url, type) {
        console.error('Ошибка загрузки медиа', url);
        const container = element.parentElement;
        container.innerHTML = `
            <div class="media-error">
                <div class="error-icon">${type === 'image' ? '📷' : '🎥'}</div>
                <div class="error-text">Не удалось загрузить</div>
                <a href="${url}" target="_blank" class="error-link">Открыть в новом окне</a>
            </div>
        `;
        container.classList.add('media-error-container');
    };
    
    loadPosts();
});