// DOM Elements (typed)
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement | null;
const searchToggle = document.getElementById('search-toggle') as HTMLButtonElement | null;
const searchBar = document.getElementById('search-bar') as HTMLElement | null;
const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
const searchClose = document.getElementById('search-close') as HTMLButtonElement | null;
const backToTop = document.getElementById('back-to-top') as HTMLButtonElement | null;
const navLinks = document.querySelectorAll('.nav-link') as NodeListOf<HTMLAnchorElement>;
const faqItems = document.querySelectorAll('.faq-item') as NodeListOf<HTMLElement>;

// Theme Management
class ThemeManager {
    private theme: 'light' | 'dark';
    constructor() {
        const saved = localStorage.getItem('theme');
        this.theme = saved === 'dark' || saved === 'light' ? saved : 'dark';
        this.init();
    }

    init() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcon();
        this.bindEvents();
    }

    toggle() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const icon = themeToggle?.querySelector('i') as HTMLElement | null;
        if (!icon) return;
        icon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    bindEvents() {
        if (!themeToggle) return;
        themeToggle.addEventListener('click', () => this.toggle());
    }

    // print removed
}

// Search Functionality
class SearchManager {
    private isSearchOpen: boolean;
    constructor() {
        this.isSearchOpen = false;
        this.bindEvents();
    }

    bindEvents() {
        if (searchToggle) searchToggle.addEventListener('click', () => this.toggleSearch());
        if (searchClose) searchClose.addEventListener('click', () => this.closeSearch());
        if (searchInput) {
            searchInput.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement | null;
                this.handleSearch(target?.value ?? '');
            });
        }
        
        // Close search on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSearchOpen) {
                this.closeSearch();
            }
        });
    }

    toggleSearch() {
        if (this.isSearchOpen) {
            this.closeSearch();
        } else {
            this.openSearch();
        }
    }

    openSearch() {
        searchBar?.classList.remove('hidden');
        searchInput?.focus();
        this.isSearchOpen = true;
        
        // Update search toggle icon
        const icon = searchToggle?.querySelector('i') as HTMLElement | null;
        if (icon) icon.className = 'fas fa-times';
    }

    closeSearch() {
        searchBar?.classList.add('hidden');
        if (searchInput) searchInput.value = '';
        this.clearSearchResults();
        this.isSearchOpen = false;
        
        // Update search toggle icon
        const icon = searchToggle?.querySelector('i') as HTMLElement | null;
        if (icon) icon.className = 'fas fa-search';
    }

    handleSearch(query: string) {
        if (query.trim() === '') {
            this.clearSearchResults();
            return;
        }

        const results = this.searchContent(query);
        this.highlightResults(results);
    }

    searchContent(query: string) {
        const searchData = this.buildSearchIndex();
        const results: any[] = [];
        const queryLower = query.toLowerCase();
        
        // Search in FAQ questions first (highest priority)
        searchData.faq.forEach((item: any, index: number) => {
            const questionScore = this.calculateRelevanceScore(item.question, queryLower);
            const answerScore = this.calculateRelevanceScore(item.answer, queryLower);
            const totalScore = questionScore * 2 + answerScore; // Questions weighted higher
            
            if (totalScore > 0) {
                results.push({
                    type: 'faq',
                    element: item.element,
                    question: item.question,
                    answer: item.answer,
                    score: totalScore,
                    index: index
                });
            }
        });
        
        // Search in section content
        searchData.sections.forEach((section: any, index: number) => {
            const titleScore = this.calculateRelevanceScore(section.title, queryLower);
            const contentScore = this.calculateRelevanceScore(section.content, queryLower);
            const totalScore = titleScore * 1.5 + contentScore;
            
            if (totalScore > 0) {
                results.push({
                    type: 'section',
                    element: section.element,
                    title: section.title,
                    content: section.content,
                    score: totalScore,
                    index: index
                });
            }
        });
        
        // Sort by relevance score (highest first)
        results.sort((a, b) => b.score - a.score);
        
        return results.slice(0, 10); // Limit to top 10 results
    }

    buildSearchIndex() {
        const searchData: { faq: Array<{ element: Element, question: string, answer: string }>, sections: Array<{ element: Element, title: string, content: string }> } = {
            faq: [],
            sections: []
        };
        
        // Build FAQ index
        faqItems.forEach((item: HTMLElement) => {
            const questionElement = item.querySelector('.faq-question span');
            const answerElement = item.querySelector('.faq-answer');
            
            if (questionElement && answerElement) {
                searchData.faq.push({
                    element: item,
                    question: (questionElement.textContent || '').trim(),
                    answer: (answerElement.textContent || '').trim()
                });
            }
        });
        
        // Build sections index
        const sections = document.querySelectorAll('.section');
        sections.forEach((section: Element) => {
            const titleElement = section.querySelector('.section-title');
            const contentElement = section.querySelector('.section-content');
            
            if (titleElement && contentElement) {
                searchData.sections.push({
                    element: section,
                    title: (titleElement.textContent || '').trim(),
                    content: (contentElement.textContent || '').trim()
                });
            }
        });
        
        return searchData;
    }

    calculateRelevanceScore(text: string, query: string) {
        const textLower = text.toLowerCase();
        let score = 0;
        
        // Exact phrase match (highest score)
        if (textLower.includes(query)) {
            score += 100;
        }
        
        // Word-by-word matching
        const queryWords = query.split(' ').filter((word: string) => word.length > 2);
        queryWords.forEach((word: string) => {
            if (textLower.includes(word)) {
                score += 10;
            }
        });
        
        // Position bonus (text at beginning gets higher score)
        const firstMatchIndex = textLower.indexOf(query);
        if (firstMatchIndex !== -1) {
            score += Math.max(0, 20 - firstMatchIndex / 10);
        }
        
        return score;
    }

    highlightResults(results: any[]) {
        // Remove previous highlights
        this.clearSearchResults();

        if (results.length === 0) {
            this.showNoResults();
            return;
        }

        // Show search results container
        this.showSearchResults(results);

        // Highlight matching elements
        results.forEach((result: any) => {
            const element = result.element;
            element.classList.add('search-result');
            
            // Scroll to first result
            if (result === results[0]) {
                setTimeout(() => {
                    element.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }, 100);
            }
        });
    }

    showSearchResults(results: any[]) {
        // Remove existing results container
        const existingContainer = document.querySelector('.search-results-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Create results container
        const container = document.createElement('div');
        container.className = 'search-results-container';
        container.innerHTML = `
            <div class="search-results-header">
                <h3>نتائج البحث (${results.length})</h3>
                <button class="close-results" aria-label="إغلاق نتائج البحث">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="search-results-list">
                ${results.map((result, index) => this.createResultItem(result, index)).join('')}
            </div>
        `;

        // Insert after search bar
        searchBar?.appendChild(container);

        // Add event listeners
        const closeBtn = container.querySelector('.close-results') as HTMLButtonElement | null;
        if (closeBtn) closeBtn.addEventListener('click', () => { this.closeSearch(); });

        // Add click listeners to result items
        container.querySelectorAll('.search-result-item').forEach((item, index) => {
            (item as HTMLElement).addEventListener('click', () => {
                const result = results[index as number];
                const el = result.element as HTMLElement;
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('search-result-highlight');
                setTimeout(() => { el.classList.remove('search-result-highlight'); }, 2000);
            });
        });
    }

    createResultItem(result: any, index: number) {
        const typeIcon = result.type === 'faq' ? 'fa-question-circle' : 'fa-file-alt';
        const typeText = result.type === 'faq' ? 'سؤال شائع' : 'قسم';
        
        return `
            <div class="search-result-item" data-index="${index}">
                <div class="result-icon">
                    <i class="fas ${typeIcon}"></i>
                </div>
                <div class="result-content">
                    <div class="result-title">
                        ${result.type === 'faq' ? result.question : result.title}
                    </div>
                    <div class="result-preview">
                        ${this.getPreviewText(result.type === 'faq' ? result.answer : result.content)}
                    </div>
                    <div class="result-type">${typeText}</div>
                </div>
            </div>
        `;
    }

    getPreviewText(text: string) {
        const maxLength = 100;
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    showNoResults() {
        const container = document.createElement('div');
        container.className = 'search-results-container no-results';
        container.innerHTML = `
            <div class="search-results-header">
                <h3>لا توجد نتائج</h3>
                <button class="close-results" aria-label="إغلاق نتائج البحث">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="no-results-message">
                <i class="fas fa-search"></i>
                <p>لم نتمكن من العثور على نتائج لـ "${searchInput?.value || ''}"</p>
                <p>جرب كلمات مختلفة أو تصفح الأقسام أدناه</p>
            </div>
        `;

        searchBar?.appendChild(container);

        const closeBtn = container.querySelector('.close-results') as HTMLButtonElement | null;
        if (closeBtn) closeBtn.addEventListener('click', () => { this.closeSearch(); });
    }

    clearSearchResults() {
        // Remove search result styling
        document.querySelectorAll('.search-result').forEach(result => {
            result.classList.remove('search-result');
        });

        // Remove search results container
        const container = document.querySelector('.search-results-container');
        if (container) {
            container.remove();
        }
    }
}

// FAQ Accordion
class FAQManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        faqItems.forEach((item: HTMLElement) => {
            const question = item.querySelector('.faq-question') as HTMLElement | null;
            if (!question) return;
            question.addEventListener('click', () => this.toggleFAQ(item));
        });
    }

    toggleFAQ(item: HTMLElement) {
        const isActive = item.classList.contains('active');
        
        // Close all other FAQ items
        faqItems.forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });

        // Toggle current item
        if (isActive) {
            item.classList.remove('active');
        } else {
            item.classList.add('active');
        }
    }
}

// Navigation Manager
class NavigationManager {
    private sections: NodeListOf<HTMLElement>;
    constructor() {
        this.sections = document.querySelectorAll('.section') as NodeListOf<HTMLElement>;
        this.bindEvents();
    }

    bindEvents() {
        // Smooth scrolling for navigation links
        navLinks.forEach((link: HTMLAnchorElement) => {
            link.addEventListener('click', (e: MouseEvent) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                if (!targetId) return;
                const targetSection = document.querySelector(targetId) as HTMLElement | null;
                
                if (targetSection) {
                    const headerHeight = (document.querySelector('.header') as HTMLElement | null)?.offsetHeight || 0;
                    const targetPosition = targetSection.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Highlight active section on scroll
        window.addEventListener('scroll', () => this.highlightActiveSection());
    }

    highlightActiveSection() {
        const scrollPosition = window.scrollY + 100;
        
        navLinks.forEach(link => link.classList.remove('active'));
        
        this.sections.forEach((section: HTMLElement) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                const activeLink = document.querySelector(`[href="#${sectionId}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    }
}

// Back to Top Button
class BackToTopManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('scroll', () => this.toggleBackToTop());
        if (backToTop) backToTop.addEventListener('click', () => this.scrollToTop());
    }

    toggleBackToTop() {
        if (!backToTop) return;
        if (window.scrollY > 300) backToTop.classList.add('visible');
        else backToTop.classList.remove('visible');
    }

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

// Utility Functions
class Utils {
    static debounce(func: (...args: any[]) => void, wait: number) {
        let timeout: any;
        return function executedFunction(...args: any[]) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func: (...args: any[]) => void, limit: number) {
        let inThrottle: any;
        return function(this: any, ...args: any[]) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Performance Optimizations
class PerformanceManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        // Throttle scroll events
        const throttledScrollHandler = Utils.throttle(() => {
            // This will be handled by individual managers
        }, 16); // ~60fps

        window.addEventListener('scroll', throttledScrollHandler);
        
        // Debounce search input
        const debouncedSearchHandler = Utils.debounce(() => {
            // This will be handled by SearchManager
        }, 300);

        if (searchInput) {
            searchInput.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement | null;
                debouncedSearchHandler(target?.value ?? '');
            });
        }
    }
}

// Accessibility Enhancements
class AccessibilityManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        // Keyboard navigation for FAQ
        faqItems.forEach((item: HTMLElement) => {
            const question = item.querySelector('.faq-question') as HTMLElement | null;
            if (!question) return;
            question.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    question.click();
                }
            });
        });

        // Skip to main content
        const skipLink = document.createElement('a');
        skipLink.href = '#main';
        skipLink.textContent = 'تخطي إلى المحتوى الرئيسي';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            right: 6px;
            background: var(--primary-color);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 1001;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
}

// Analytics and Tracking (Optional)
class AnalyticsManager {
    constructor() {
        this.trackEvents();
    }

    trackEvents() {
        // Track FAQ interactions
        faqItems.forEach((item: HTMLElement) => {
            const question = item.querySelector('.faq-question') as HTMLElement | null;
            if (!question) return;
            question.addEventListener('click', () => {
                const span = question.querySelector('span') as HTMLElement | null;
                const questionText = span?.textContent || '';
                this.trackEvent('FAQ', 'Question Clicked', questionText);
            });
        });

        // Track search usage
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e: Event) => {
                const target = e.target as HTMLInputElement | null;
                const val = target?.value ?? '';
                if (val.trim()) this.trackEvent('Search', 'Search Query', val);
            }, 1000));
        }

        // Track theme changes
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme') || '';
                this.trackEvent('Theme', 'Theme Changed', currentTheme);
            });
        }
    }

    trackEvent(category: string, action: string, label: string) {
        // This is where you would integrate with Google Analytics or similar
        // For now, we'll just log to console
        console.log('Analytics Event:', { category, action, label });
        
        // Example Google Analytics 4 event
        const g = (window as any).gtag;
        if (typeof g !== 'undefined') {
            g('event', action, { event_category: category, event_label: label });
        }
    }
}

// Error Handling
class ErrorManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('error', (e: ErrorEvent) => {
            console.error('JavaScript Error:', e.error);
            this.handleError(e.error);
        });

        window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
            console.error('Unhandled Promise Rejection:', e.reason);
            this.handleError(e.reason);
        });
    }

    handleError(error: unknown) {
        // Log error to console for development
        console.error('Error occurred:', error);
        
        // In production, you might want to send this to an error tracking service
        // like Sentry, LogRocket, or similar
    }
}

// Initialize all managers when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all managers
    new ThemeManager();
    new SearchManager();
    new FAQManager();
    new NavigationManager();
    new BackToTopManager();
    new PerformanceManager();
    new AccessibilityManager();
    new AnalyticsManager();
    new ErrorManager();

    // Add loading animation
    document.body.classList.add('loaded');

    // Log initialization
    console.log('دليل البعثات الدراسية - تم التحميل بنجاح');
});

// Service Worker Registration (for PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

