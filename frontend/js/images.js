// Image Mapping Configuration
// You can edit this file to update images.
const foodImages = {
    // We will update these as you provide them
    'Idli (2 Pcs)': 'img/idli.jpg',
    'Masala Dosa': 'img/dosa.jpg',
    'Medhu Vada': 'img/vada.jpg',
    'Ven Pongal': 'img/placeholder.jpg',
    'Chicken Biryani': 'img/placeholder.jpg',
    'Veg Meals': 'img/placeholder.jpg',
    'Mutton Biryani': 'img/placeholder.jpg',
    'Parotta': 'img/placeholder.jpg',
    'Chapati': 'img/placeholder.jpg',
    'Filter Coffee': 'img/placeholder.jpg',
    'Masala Tea': 'img/placeholder.jpg',
    'Jigarthanda': 'img/placeholder.jpg',
    'Payasam': 'img/placeholder.jpg'
};

function getFoodImage(name) {
    if (foodImages[name] && foodImages[name] !== 'img/placeholder.jpg') {
        return foodImages[name];
    }
    // Temporary fallback until you provide images
    return `https://placehold.co/400x300/1e293b/FFF?text=${encodeURIComponent(name)}`;
}
