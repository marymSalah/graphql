window.addEventListener('load', async () => {
    const token = localStorage.getItem('jwt_token').replace(/"/g, '');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `{
                    user {
                        id
                        login
                        campus
                        auditRatio
                        createdAt
                    }
                }`
            })
        });

        const data = await response.json();
        if (data.data && data.data.user[0]) {
            const user = data.data.user[0];
            displayUserData(user);
            displayAuditRatio(token, user.login);
            fetchAuditsGiven(user.id);
        }
    } catch (error) {
        console.error('Failed to fetch data:', error);
    }
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
});

async function fetchAuditsGiven(userid) {
    const query = `
        query FetchAudits($userid: Int!) {
            audit(where: {auditorId: {_eq: $userid}, grade: {_is_null: false}}) {
                auditorId
                grade
            }
        }
    `;

    const variables = { userid: parseInt(userid, 10) };  // Ensure userid is an integer

    const data = await makeGraphQLRequest(query, variables);
    displayPieChart(data.data.audit);
    console.log("audits", data);
}






async function displayPieChart(audits) {
    const svgContainer = document.getElementById('audit-chart');
    document.getElementById('totalAuditsDone').textContent = audits.length;
    
    const radius = Math.min(svgContainer.clientWidth, svgContainer.clientHeight) * 0.35;
    const centerX = svgContainer.clientWidth / 2;
    const centerY = svgContainer.clientHeight / 2;
 
    const passCount = audits.filter(audit => audit.grade >= 1).length;
    const failCount = audits.filter(audit => audit.grade < 1).length;
    const total = passCount + failCount;
    
    const passAngle = (passCount / total) * 360;
    const failAngle = (failCount / total) * 360;
 
    svgContainer.innerHTML = '';
    svgContainer.setAttribute('class', 'w-full h-full');
    
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    
    // Updated gradients to match violet/blue theme
    const passGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    passGradient.setAttribute("id", "passGradient");
    passGradient.innerHTML = `
        <stop offset="0%" stop-color="#8B5CF6" /> <!-- violet-500 -->
        <stop offset="100%" stop-color="#6366F1" /> <!-- indigo-500 -->
    `;
    
    const failGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    failGradient.setAttribute("id", "failGradient");
    failGradient.innerHTML = `
        <stop offset="0%" stop-color="#4F46E5" /> <!-- indigo-600 -->
        <stop offset="100%" stop-color="#4338CA" /> <!-- indigo-700 -->
    `;
    
    defs.appendChild(passGradient);
    defs.appendChild(failGradient);
    svgContainer.appendChild(defs);
 
    const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bgCircle.setAttribute("cx", centerX);
    bgCircle.setAttribute("cy", centerY);
    bgCircle.setAttribute("r", radius);
    bgCircle.setAttribute("fill", "rgb(24 24 27)"); // zinc-900
 
    const passSlice = createPieSlice(0, passAngle, radius, centerX, centerY, "url(#passGradient)");
    const failSlice = createPieSlice(passAngle, passAngle + failAngle, radius, centerX, centerY, "url(#failGradient)");
 
    passSlice.setAttribute("class", "transition-all duration-300 hover:opacity-90");
    failSlice.setAttribute("class", "transition-all duration-300 hover:opacity-90");
    
    svgContainer.appendChild(bgCircle);
    svgContainer.appendChild(passSlice);
    svgContainer.appendChild(failSlice);
 
    const passPercentage = Math.round((passCount / total) * 100);
    const failPercentage = Math.round((failCount / total) * 100);
 
    const passLabel = createLabel(centerX, centerY - radius - 20, 
        `Pass (${passCount})`, '#8B5CF6', `${passPercentage}%`); // violet-500
    const failLabel = createLabel(centerX, centerY + radius + 20, 
        `Fail (${failCount})`, '#6366F1', `${failPercentage}%`); // indigo-500
 
    svgContainer.appendChild(passLabel);
    svgContainer.appendChild(failLabel);
 } 

 function createPieSlice(startAngle, endAngle, radius, centerX, centerY, fillColor) {
    const startX = centerX + radius * Math.cos(Math.PI * startAngle / 180);
    const startY = centerY + radius * Math.sin(Math.PI * startAngle / 180);
    const endX = centerX + radius * Math.cos(Math.PI * endAngle / 180);
    const endY = centerY + radius * Math.sin(Math.PI * endAngle / 180);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    const pathData = [
        'M', centerX, centerY,
        'L', startX, startY,
        'A', radius, radius, 0, largeArcFlag, 1, endX, endY,
        'Z'
    ].join(' ');

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute('d', pathData);
    path.setAttribute('fill', fillColor);
    path.setAttribute('filter', 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.3))');

    return path;
}

 function createLabel(x, y, text, color, percentage) {
    const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const padding = 10;
    const width = text.length * 8 + padding * 2;
    bgRect.setAttribute("x", x - width / 2);
    bgRect.setAttribute("y", y - 15);
    bgRect.setAttribute("width", width);
    bgRect.setAttribute("height", 22);
    bgRect.setAttribute("rx", 4);
    bgRect.setAttribute("fill", "rgb(24 24 27)"); // zinc-900
    bgRect.setAttribute("class", "opacity-80");
    
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x);
    label.setAttribute("y", y);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", color);
    label.setAttribute("class", "font-medium text-sm");
    label.textContent = text;
 
    labelGroup.appendChild(bgRect);
    labelGroup.appendChild(label);
 
    return labelGroup;
 }






async function fetchAuditsReceived(token, username) {
    const query = `{
        user(where: {login: {_eq: "${username}"}}) {
            transactions(
                where: {
                    user: {login: {_eq: "${username}"}},
                    type: {_eq: "down"},
                    object: {type: {_eq: "project"}}
                },
                order_by: {createdAt: asc}
            ) {
                amount
                createdAt
            }
        }
    }`;
    
    const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });
    
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data.data.user[0].transactions;
}

async function fetchAuditsMade(token, username) {
    const query = `{
        user(where: {login: {_eq: "${username}"}}) {
            transactions(
                where: {
                    user: {login: {_eq: "${username}"}},
                    type: {_eq: "up"},
                    object: {type: {_eq: "project"}}
                },
                order_by: {createdAt: asc}
            ) {
                amount
                createdAt
            }
        }
    }`;
    
    const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });
    
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data.data.user[0].transactions;
}

async function displayAuditRatio(token, username) {
    try {
        const auditsReceived = await fetchAuditsReceived(token, username);
        const auditsMade = await fetchAuditsMade(token, username);
        const totalReceived = calculateTotalAmount(auditsReceived);
        const totalMade = calculateTotalAmount(auditsMade);
        const ratio = calculateRatio(totalMade, totalReceived);

        document.getElementById('audit-made-value-right').textContent = `${(totalMade / 1000).toFixed(2)} KB`;
        document.getElementById('audit-received-value-right').textContent = `${(totalReceived / 1000).toFixed(2)} KB`;
        document.getElementById('audit-ratio').textContent = ratio;
        document.getElementById('audit-message').textContent = ratio < 1 ? 'Make more audits!' : 'Good job!';

        document.getElementById('audit-made-bar').style.width = `${(totalMade / (totalMade + totalReceived)) * 100}%`;
        document.getElementById('audit-received-bar').style.width = `${(totalReceived / (totalMade + totalReceived)) * 100}%`;
    } catch (error) {
        console.error('Error fetching audit data:', error);
    }
}

function calculateTotalAmount(transactions) {
    return transactions.reduce((total, t) => total + t.amount, 0);
}


function calculateRatio(auditsMade, auditsReceived) {
    if (auditsReceived === 0) return 0;
    return (auditsMade / auditsReceived).toFixed(2);
}


function displayUserData(user) {
    // Set initials
    const initials = user.login.slice(0, 2).toUpperCase();
    document.getElementById('userInitials').textContent = initials;
    
    // Set name and campus
    document.getElementById('userName').textContent = user.login;
    document.getElementById('userCampus').textContent = user.campus;
    
    // Set additional info
    document.getElementById('userJoinDate').textContent = new Date(user.createdAt).toLocaleDateString();
    document.getElementById('userId').textContent = user.id;
}

async function makeGraphQLRequest(query, variables = {}) {
    const token = localStorage.getItem('jwt_token').replace(/"/g, '');
    const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables })
    });

    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(`GraphQL error: ${responseText}`);
    }

    return JSON.parse(responseText);
}