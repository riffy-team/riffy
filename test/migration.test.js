const assert = require('assert');
const util = require('util');
const { Riffy } = require('../build/index');
const { Player } = require('../build/structures/Player');
const { Node } = require('../build/structures/Node');

// --- Test Setup ---

function createSpy() {
    const spy = (...args) => {
        spy.called = true;
        spy.callCount++;
        spy.calls.push(args);
    };
    spy.called = false;
    spy.callCount = 0;
    spy.calls = [];
    spy.reset = () => {
        spy.called = false;
        spy.callCount = 0;
        spy.calls = [];
    };
    return spy;
}

const mockClient = { user: { id: '1234567890' } };
const mockSend = () => {};

function printSpyCall(spy, callIndex, name) {
    console.log(`  > Spied call to '${name}':`);
    if (spy.callCount > callIndex) {
        const callArgs = util.inspect(spy.calls[callIndex], { depth: 2, colors: true });
        console.log(`    - Arguments: ${callArgs}`);
    } else {
        console.log(`    - (Not called)`);
    }
}

// --- Test Suite ---

async function runTests() {
    console.log('--- Running Riffy Migration Unit Test ---');

    const riffyOptions = { send: mockSend, restVersion: 'v4' };
    const riffy = new Riffy(mockClient, [], riffyOptions);
    riffy.initiated = true;

    const node1 = new Node(riffy, { name: 'Node-1', host: 'localhost', port: 3001, password: '123' }, riffy.options);
    const node2 = new Node(riffy, { name: 'Node-2', host: 'localhost', port: 3000, password: '123' }, riffy.options);

    node1.rest.destroyPlayer = createSpy();
    node1.rest.updatePlayer = createSpy();
    node2.rest.destroyPlayer = createSpy();
    node2.rest.updatePlayer = createSpy();

    node1.connected = true;
    node2.connected = true;
    riffy.nodeMap.set('Node-1', node1);
    riffy.nodeMap.set('Node-2', node2);

    // --- Test 1: Single Player Migration ---
    console.log('\n[Test 1] Running: Single Player Migration');

    const player1 = riffy.createPlayer(node1, { guildId: 'GUILD_1', voiceChannel: 'VC_1' });
    player1.connected = true;
    player1.current = { track: 'MOCK_ENCODED_TRACK_1', info: { title: 'Test Song 1' } };
    player1.position = 15000; // Fictitious position
    player1.paused = false;
    player1.connection.voice = { token: 'mock_token_1', endpoint: 'mock_endpoint_1', sessionId: 'mock_session_id_1' };

    console.log(`  - Action: Migrating player1 (at ${player1.position}ms) from Node-1 to Node-2`);
    await riffy.migrate(player1);

    console.log('  - Verifying calls:');
    printSpyCall(node1.rest.destroyPlayer, 0, 'oldNode.destroyPlayer');
    printSpyCall(node2.rest.updatePlayer, 0, 'newNode.updatePlayer (voice)');
    printSpyCall(node2.rest.updatePlayer, 1, 'newNode.updatePlayer (track/state)');

    assert.strictEqual(player1.node.name, 'Node-2', 'Test 1 FAIL: Player did not move to Node-2');
    assert.strictEqual(node1.rest.destroyPlayer.callCount, 1, 'Test 1 FAIL: destroyPlayer was not called once on the old node');
    assert.strictEqual(node2.rest.updatePlayer.callCount, 2, 'Test 1 FAIL: updatePlayer was not called twice on the new node');
    
    const voiceUpdateCall = node2.rest.updatePlayer.calls[0][0];
    assert.deepStrictEqual(voiceUpdateCall.data.voice, player1.connection.voice, 'Test 1 FAIL: First updatePlayer call did not contain the correct voice data');

    const trackUpdateCall = node2.rest.updatePlayer.calls[1][0];
    assert.strictEqual(trackUpdateCall.data.track.encoded, 'MOCK_ENCODED_TRACK_1', 'Test 1 FAIL: Second updatePlayer call did not contain track data');
    assert.strictEqual(trackUpdateCall.data.position, 15000, 'Test 1 FAIL: Position was not restored correctly');
    console.log(`  > Position restored to: ${trackUpdateCall.data.position}ms as expected.`);

    console.log('[Test 1] SUCCESS');

    // --- Test 2: Full Node Migration ---
    console.log('\n[Test 2] Running: Full Node Migration');

    node1.rest.destroyPlayer.reset();
    node2.rest.updatePlayer.reset();
    console.log('  - Setup: Moving player1 back to Node-1');
    await player1.moveTo(node1);

    const player2 = riffy.createPlayer(node1, { guildId: 'GUILD_2', voiceChannel: 'VC_2' });
    player2.position = 99000; // Different fictitious position
    riffy.players.set('GUILD_2', player2);
    console.log(`  - Setup: Created player2 on Node-1 (at ${player2.position}ms)`);

    console.log('  - Action: Migrating all players from Node-1');
    await riffy.migrate(node1);

    console.log('  - Verifying calls:');
    assert.strictEqual(player1.node.name, 'Node-2', 'Test 2 FAIL: Player 1 did not move to Node-2');
    assert.strictEqual(player2.node.name, 'Node-2', 'Test 2 FAIL: Player 2 did not move to Node-2');
    assert.strictEqual(node1.rest.destroyPlayer.callCount, 2, 'Test 2 FAIL: destroyPlayer was not called for both players');
    console.log(`  > Spied call to 'oldNode.destroyPlayer': was called ${node1.rest.destroyPlayer.callCount} times as expected.`);

    console.log('[Test 2] SUCCESS');

    // --- Test 3: Stress Test with 10 Players ---
    console.log('\n[Test 3] Running: Stress Test with 10 Players');

    node1.rest.destroyPlayer.reset();
    node1.rest.updatePlayer.reset();
    node2.rest.destroyPlayer.reset();
    node2.rest.updatePlayer.reset();
    riffy.players.clear();

    for (let i = 0; i < 10; i++) {
        const node = (i < 7) ? node1 : node2; // 7 on Node-1, 3 on Node-2
        const player = riffy.createPlayer(node, { guildId: `STRESS_${i}`, voiceChannel: `VC_${i}` });
        riffy.players.set(`STRESS_${i}`, player);
    }

    const countPlayersOnNode = (node) => [...riffy.players.values()].filter(p => p.node === node).length;

    console.log(`  - Setup: Created 10 players. Distribution: Node-1: ${countPlayersOnNode(node1)}, Node-2: ${countPlayersOnNode(node2)}`);
    assert.strictEqual(countPlayersOnNode(node1), 7, 'Test 3 FAIL: Initial distribution on Node-1 is incorrect');
    assert.strictEqual(countPlayersOnNode(node2), 3, 'Test 3 FAIL: Initial distribution on Node-2 is incorrect');

    console.log('  - Action 1: Migrating all players from Node-1 to Node-2');
    await riffy.migrate(node1);

    console.log(`  - Verifying Action 1: Distribution: Node-1: ${countPlayersOnNode(node1)}, Node-2: ${countPlayersOnNode(node2)}`);
    assert.strictEqual(countPlayersOnNode(node1), 0, 'Test 3.1 FAIL: Node-1 should be empty');
    assert.strictEqual(countPlayersOnNode(node2), 10, 'Test 3.1 FAIL: Node-2 should have all 10 players');
    console.log('  - Action 1: SUCCESS');

    console.log('  - Action 2: Migrating all players from Node-2 back to Node-1');
    await riffy.migrate(node2);

    console.log(`  - Verifying Action 2: Distribution: Node-1: ${countPlayersOnNode(node1)}, Node-2: ${countPlayersOnNode(node2)}`);
    assert.strictEqual(countPlayersOnNode(node1), 10, 'Test 3.2 FAIL: Node-1 should have all 10 players');
    assert.strictEqual(countPlayersOnNode(node2), 0, 'Test 3.2 FAIL: Node-2 should be empty');
    console.log('  - Action 2: SUCCESS');

    console.log('[Test 3] SUCCESS');

    console.log('\n--- All Tests Passed ---');
    process.exit(0);
}

runTests().catch(err => {
    console.error('\n--- TEST FAILED ---');
    console.error(err);
    process.exit(1);
});
