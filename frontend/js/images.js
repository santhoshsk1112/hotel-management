// Image Mapping Configuration
// You can edit this file to update images.
const foodImages = {
    // We will update these as you provide them
    'Idli (2 Pcs)': 'img/idli.jpg',
    'Masala Dosa': 'img/dosa.jpg',
    'Medhu Vada': 'img/vada.jpg',
    'Ven Pongal': 'img/ven pongal.jpg',
    'Chicken Biryani': 'img/chicken BIriyani.jpg',
    'Veg Meals': 'img/veg meals.jpg',
    'Mutton Biryani': 'img/mutton biryani.jpg',
    'Parotta': 'img/parotta.jpg',
    'Chapati': 'img/chapati.jpg',
    'Filter Coffee': 'img/filter coffee.jpg',
    'Masala Tea': 'img/masala tea.jpg',
    'Jigarthanda': 'img/jigarthanda.jpg',
    'Payasam': 'img/payasam.jpg'
};

function getFoodImage(name) {
    if (foodImages[name] && foodImages[name] !== 'img/placeholder.jpg') {
        return foodImages[name];
    }
    // Temporary fallback until you provide images
    return `https://placehold.co/400x300/1e293b/FFF?text=${encodeURIComponent(name)}`;
}
