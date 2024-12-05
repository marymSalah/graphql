// main.js
async function getJWTToken(username, password) {
    const credentials = btoa(`${username}:${password}`);
    
    try {
        const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });

        if (!response.ok) throw new Error('Authentication failed');
        const data = await response.text(); // Get raw token
        console.log(data);
        return data; // Return token directly
    } catch (error) {
        throw error;
    }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const token = await getJWTToken(
            document.getElementById('username').value,
            document.getElementById('password').value
        );
        
        localStorage.setItem('jwt_token', token.replace(/"/g, ''));
        window.location.href= "profile.html";
        // const userData = await fetchUserData(token);
        
        // if (userData && userData.data) {
        //     localStorage.setItem('userData', JSON.stringify(userData.data));
        //     window.location.href = 'profile.html';
        // }
    } catch (error) {
        alert('Login failed');
    }
});