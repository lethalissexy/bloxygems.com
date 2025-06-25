function scrapePetData() {
    const pets = [];
    
    // Get all card boxes
    document.querySelectorAll('a[href*="details.php"]').forEach(card => {
        try {
            const pet = {
                name: card.querySelector('.item-name').textContent.trim(),
                image: card.querySelector('img').src,
                value: card.querySelector('.value-container span:last-child').textContent.trim(),
                variant: card.querySelector('.float-right.text-gold')?.textContent.trim() || 'Normal',
                demand: card.querySelector('.float-right.pt-2:last-child').textContent.trim(),
                exist: card.querySelector('.exist-indicator').textContent.replace('EXIST:', '').trim(),
                rap: card.querySelector('.rap-indicator').textContent.replace('RAP:', '').trim()
            };
            
            // Clean up the value (remove any whitespace/newlines)
            pet.value = pet.value.replace(/\s+/g, '');
            
            // Only push if it's a huge pet
            if (pet.name.includes('HUGE')) {
                pets.push(pet);
            }
            
        } catch (error) {
            console.warn('Error scraping card:', error);
        }
    });

    // Log the results
    console.log('Found', pets.length, 'huge pets');
    console.table(pets); // This will show the data in a nice table format
    
    // Copy to clipboard as JSON
    const jsonStr = JSON.stringify(pets, null, 2);
    navigator.clipboard.writeText(jsonStr);
    console.log('Data copied to clipboard!');
    
    return pets;
}

// Run the scraper
scrapePetData();
