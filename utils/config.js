const categories = {
    tech: {
        name: 'Technology',
        description: 'Latest developments in AI, software, hardware, and digital innovation'
    },
    health: {
        name: 'Health & Wellness',
        description: 'Modern approaches to physical and mental wellbeing, fitness, and lifestyle'
    },
    business: {
        name: 'Business & Finance',
        description: 'Current trends in entrepreneurship, digital business, and financial technology'
    },
    sports: {
        name: 'Sports & Athletics',
        description: 'Latest in sports technology, training methods, performance analytics, and athletic achievements'
    },
    education: {
        name: 'Education & Learning',
        description: 'Modern educational technologies, learning methodologies, and academic innovations'
    }
};

const defaultSchedule = {
    times: ['16:00'],
    timezone: 'Asia/Kolkata',
    maxPostsPerDay: 3,
    minPostsPerDay: 1
};

module.exports = {
    categories,
    defaultSchedule
}; 