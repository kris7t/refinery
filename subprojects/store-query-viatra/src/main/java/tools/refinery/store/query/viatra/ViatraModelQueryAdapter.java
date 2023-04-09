/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package tools.refinery.store.query.viatra;

import tools.refinery.store.query.ModelQueryAdapter;

public interface ViatraModelQueryAdapter extends ModelQueryAdapter {
	@Override
	ViatraModelQueryStoreAdapter getStoreAdapter();
}
