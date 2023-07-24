/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.map;

import tools.refinery.store.map.internal.*;

import java.util.*;

public class VersionedMapStoreImpl<K, V> implements VersionedMapStore<K, V> {
	// Configuration
	private final boolean immutableWhenCommitting;

	// Static data
	protected final ContinousHashProvider<K> hashProvider;
	protected final V defaultValue;

	// Dynamic data
	protected final Map<Long, ImmutableNode<K, V>> states = new HashMap<>();
	protected final Map<Node<K, V>, ImmutableNode<K, V>> nodeCache;
	protected long nextID = 0;

	public VersionedMapStoreImpl(ContinousHashProvider<K> hashProvider, V defaultValue,
			VersionedMapStoreConfiguration config) {
		this.immutableWhenCommitting = config.isImmutableWhenCommitting();
		this.hashProvider = hashProvider;
		this.defaultValue = defaultValue;
		if (config.isSharedNodeCacheInStore()) {
			nodeCache = new HashMap<>();
		} else {
			nodeCache = null;
		}
	}

	private VersionedMapStoreImpl(ContinousHashProvider<K> hashProvider, V defaultValue,
			Map<Node<K, V>, ImmutableNode<K, V>> nodeCache, VersionedMapStoreConfiguration config) {
		this.immutableWhenCommitting = config.isImmutableWhenCommitting();
		this.hashProvider = hashProvider;
		this.defaultValue = defaultValue;
		this.nodeCache = nodeCache;
	}

	public VersionedMapStoreImpl(ContinousHashProvider<K> hashProvider, V defaultValue) {
		this(hashProvider, defaultValue, new VersionedMapStoreConfiguration());
	}

	public static <K, V> List<VersionedMapStore<K, V>> createSharedVersionedMapStores(int amount,
			ContinousHashProvider<K> hashProvider, V defaultValue,
			VersionedMapStoreConfiguration config) {
		List<VersionedMapStore<K, V>> result = new ArrayList<>(amount);
		if (config.isSharedNodeCacheInStoreGroups()) {
			Map<Node<K, V>, ImmutableNode<K, V>> nodeCache;
			if (config.isSharedNodeCacheInStore()) {
				nodeCache = new HashMap<>();
			} else {
				nodeCache = null;
			}
			for (int i = 0; i < amount; i++) {
				result.add(new VersionedMapStoreImpl<>(hashProvider, defaultValue, nodeCache, config));
			}
		} else {
			for (int i = 0; i < amount; i++) {
				result.add(new VersionedMapStoreImpl<>(hashProvider, defaultValue, config));
			}
		}
		return result;
	}

	public static <K, V> List<VersionedMapStore<K, V>> createSharedVersionedMapStores(int amount,
			ContinousHashProvider<K> hashProvider, V defaultValue) {
		return createSharedVersionedMapStores(amount, hashProvider, defaultValue, new VersionedMapStoreConfiguration());
	}

	@Override
	public synchronized Set<Long> getStates() {
		return new HashSet<>(states.keySet());
	}

	@Override
	public VersionedMap<K, V> createMap() {
		return new VersionedMapImpl<>(this, hashProvider, defaultValue);
	}

	@Override
	public VersionedMap<K, V> createMap(long state) {
		ImmutableNode<K, V> data = revert(state);
		return new VersionedMapImpl<>(this, hashProvider, defaultValue, data);
	}

	public synchronized ImmutableNode<K, V> revert(long state) {
		if (states.containsKey(state)) {
			return states.get(state);
		} else {
			ArrayList<Long> existingKeys = new ArrayList<>(states.keySet());
			Collections.sort(existingKeys);
			throw new IllegalArgumentException("Store does not contain state " + state + "! Available states: "
					+ Arrays.toString(existingKeys.toArray()));
		}
	}

	public synchronized long commit(Node<K, V> data, VersionedMapImpl<K, V> mapToUpdateRoot) {
		ImmutableNode<K, V> immutable;
		if (data != null) {
			immutable = data.toImmutable(this.nodeCache);
		} else {
			immutable = null;
		}

		if (nextID == Long.MAX_VALUE)
			throw new IllegalStateException("Map store run out of Id-s");
		long id = nextID++;
		this.states.put(id, immutable);
		if (this.immutableWhenCommitting) {
			mapToUpdateRoot.setRoot(immutable);
		}
		return id;
	}

	@Override
	public DiffCursor<K, V> getDiffCursor(long fromState, long toState) {
		VersionedMapImpl<K, V> map1 = (VersionedMapImpl<K, V>) createMap(fromState);
		VersionedMapImpl<K, V> map2 = (VersionedMapImpl<K, V>) createMap(toState);
		InOrderMapCursor<K, V> cursor1 = new InOrderMapCursor<>(map1);
		InOrderMapCursor<K, V> cursor2 = new InOrderMapCursor<>(map2);
		return new MapDiffCursor<>(this.defaultValue, cursor1, cursor2);
	}
}
